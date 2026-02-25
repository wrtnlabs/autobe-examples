import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_report_create } from "../../../generate/generate_random_reddit_clone_member_posts_report_create";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_owner_dismiss_nonexistent_report_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registration and login
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
  } satisfies IRedditCloneOwner.IJoin;
  const ownerAuthorized = await authorize_owner_join(ownerConnection, {
    body: ownerJoinInput,
  });
  typia.assert(ownerAuthorized);
  // Create new connection with owner token
  const ownerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuthorized.token.access,
    },
  };
  // 2. Owner creates a community
  const communityInput = {
    name: RandomGenerator.name(),
    description: null,
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerAuthConnection,
    {
      body: communityInput,
    },
  );
  typia.assert(community);
  // 3. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IRedditCloneMember.IJoin;
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberAuthorized);
  // Create new connection with member token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuthorized.token.access,
    },
  };
  // Member creates a post in the community
  const postInput = {
    type: "text" as const,
    title: RandomGenerator.name(),
    community_id: community.id,
    content: RandomGenerator.paragraph(),
    url: null,
    imageUrl: null,
  } satisfies IRedditCloneContentPost.ICreate;
  const post = await api.functional.redditClone.member.posts.create(
    memberAuthConnection,
    {
      body: postInput,
    },
  );
  typia.assert(post);
  // 4. Member reports the post
  const reportInput = {
    report_type: "post" as const,
    reason: RandomGenerator.paragraph(),
    post_id: post.id,
    comment_id: null,
  } satisfies IRedditCloneContentReport.ICreate;
  // Create report via member connection
  const reportPostConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuthorized.token.access,
    },
  };
  await api.functional.redditClone.member.posts.report.create(
    reportPostConnection,
    {
      postId: post.id,
      body: reportInput,
    },
  );
  // 5. Owner attempts to dismiss a report with synthetic ID (non-existent)
  const syntheticReportId = "00000000-0000-0000-0000-000000000000";
  try {
    await api.functional.redditClone.owner.communities.reports.dismiss(
      ownerAuthConnection,
      {
        communityId: community.id,
        reportId: syntheticReportId,
      },
    );
    // If we get here, the test failed - should have thrown an error
    throw new Error("Expected 404 Not Found but request succeeded");
  } catch (error) {
    // Verify it's a 404 error
    if (error instanceof Error) {
      // For generic Error objects in TypeScript
      if ("status" in error && typeof (error as any).status === "number") {
        TestValidator.equals("status code is 404", (error as any).status, 404);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}