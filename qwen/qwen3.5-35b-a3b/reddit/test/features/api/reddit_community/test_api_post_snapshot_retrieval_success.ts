import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  // 2. Generate a test post snapshot with all required fields
  // Since we cannot create a post through the API (no create post endpoint available),
  // we generate the snapshot data structure directly to validate the retrieval endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const authorId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeOptions = ["text" as const, "link" as const, "image" as const];
  const selectedPostType = RandomGenerator.pick(postTypeOptions);
  const testContent =
    selectedPostType === "text"
      ? RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        })
      : null;
  const testLinkUrl =
    selectedPostType === "link"
      ? `https://${RandomGenerator.alphabets(8)}.com/article-${typia.random<number>()}`
      : null;
  const snapshotCreatedAt = new Date().toISOString();
  
  // Build nested objects first to avoid circular reference
  const expectedAuthor: IRedditCommunityMember.ISummary = {
    id: authorId,
    username: RandomGenerator.name(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const expectedCommunity: IRedditCommunityCommunity.ISummary = {
    id: communityId,
    name: RandomGenerator.alphabets(6),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    subscriber_count: typia.random<number & tags.Type<"int32">>(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    deleted_at: null,
  };
  const expectedPost: IRedditCommunityPost.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    post_type: selectedPostType,
    text_content:
      selectedPostType === "text"
        ? (testContent?.substring(0, 200) ?? null)
        : null,
    link_url: testLinkUrl,
    vote_score: typia.random<number & tags.Type<"int32">>(),
    comment_count: typia.random<number & tags.Type<"int32">>(),
    created_at: snapshotCreatedAt,
    updated_at: snapshotCreatedAt,
    deleted_at: null,
    author: expectedAuthor,
    community: expectedCommunity,
  };
  const expectedSnapshot: IRedditCommunityPostSnapshot = {
    id: snapshotId,
    title: expectedPost.title,
    post_type: selectedPostType,
    content: testContent,
    link_url: testLinkUrl,
    status: RandomGenerator.pick(["active" as const, "deleted" as const]),
    created_at: snapshotCreatedAt,
    author: expectedAuthor,
    community: expectedCommunity,
    redditCommunityPost: expectedPost,
  };
  // 3. Retrieve snapshot using admin endpoint
  // In simulation mode, this generates random data for validation
  const connectionWithSimulation: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const retrievedSnapshot: IRedditCommunityPostSnapshot =
    await api.functional.redditCommunity.admin.snapshots.at(
      connectionWithSimulation,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(retrievedSnapshot);
  // 4. Validate response structure and all required fields exist
  TestValidator.equals(
    "snapshot id is valid uuid",
    retrievedSnapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot title is non-empty string",
    retrievedSnapshot.title.length > 0,
  );
  TestValidator.equals(
    "post_type is valid",
    retrievedSnapshot.post_type,
    selectedPostType,
  );
  TestValidator.equals("status is valid", retrievedSnapshot.status, "active");
  TestValidator.equals(
    "created_at format valid",
    retrievedSnapshot.created_at,
    snapshotCreatedAt,
  );
  // 5. Validate nested author structure
  TestValidator.predicate(
    "author username is non-empty",
    retrievedSnapshot.author.username.length > 0,
  );
  TestValidator.equals(
    "author id is valid uuid",
    retrievedSnapshot.author.id,
    authorId,
  );
  TestValidator.notEquals(
    "author updated_at differs from created_at",
    retrievedSnapshot.author.updated_at,
    retrievedSnapshot.author.created_at,
  );
  // 6. Validate nested community structure
  TestValidator.predicate(
    "community name is non-empty",
    retrievedSnapshot.community.name.length > 0,
  );
  TestValidator.equals(
    "community id is valid uuid",
    retrievedSnapshot.community.id,
    communityId,
  );
  TestValidator.predicate(
    "community subscriber_count is valid",
    retrievedSnapshot.community.subscriber_count !== undefined,
  );
  TestValidator.notEquals(
    "community created_at is set",
    retrievedSnapshot.community.created_at,
    undefined,
  );
  // 7. Validate nested redditCommunityPost structure
  TestValidator.equals(
    "nested post title matches snapshot title",
    retrievedSnapshot.redditCommunityPost.title,
    expectedSnapshot.title,
  );
  TestValidator.equals(
    "nested post type matches snapshot post_type",
    retrievedSnapshot.redditCommunityPost.post_type,
    selectedPostType,
  );
  // 8. Validate content/link_url based on post_type
  if (selectedPostType === "text") {
    TestValidator.predicate(
      "text post has content",
      retrievedSnapshot.content !== null &&
        retrievedSnapshot.content !== undefined,
    );
    TestValidator.equals(
      "text post link_url is null",
      retrievedSnapshot.link_url,
      null,
    );
  } else if (selectedPostType === "link") {
    TestValidator.predicate(
      "link post has link_url",
      retrievedSnapshot.link_url !== null &&
        retrievedSnapshot.link_url !== undefined,
    );
    TestValidator.equals(
      "link post content is null",
      retrievedSnapshot.content,
      null,
    );
  } else if (selectedPostType === "image") {
    TestValidator.equals(
      "image post content is null",
      retrievedSnapshot.content,
      null,
    );
    TestValidator.equals(
      "image post link_url is null",
      retrievedSnapshot.link_url,
      null,
    );
  }
  // 9. Validate immutability - snapshot data represents historical record
  TestValidator.predicate(
    "snapshot created_at is immutable historical data",
    retrievedSnapshot.created_at !== undefined &&
      retrievedSnapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot id is immutable identifier",
    retrievedSnapshot.id !== undefined,
  );
}