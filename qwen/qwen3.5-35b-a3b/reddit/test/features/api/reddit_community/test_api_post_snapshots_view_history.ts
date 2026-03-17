import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_snapshots_view_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Post creation in community (using a random community_id)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        post_type: "text",
        body: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 10,
          wordMax: 20,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  const authorId = post.author.id;
  // 3. First edit - create first snapshot
  const firstEditTitle = `Edited: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })}`;
  const firstEditBody = `First edit: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 10, wordMax: 15 })}`;
  const firstUpdate = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: firstEditTitle,
        text_post_body: firstEditBody,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Second edit - create second snapshot
  const secondEditTitle = `Update #2: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })}`;
  const secondUpdate = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: secondEditTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 5. Third edit - create third snapshot
  const thirdEditTitle = `Final: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 })}`;
  const thirdUpdate = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: thirdEditTitle,
        text_post_body: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 8,
          wordMax: 12,
        }),
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // 6. Retrieve snapshots
  const snapshotsResponse =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate snapshot count
  TestValidator.equals(
    "snapshot count equals number of edits",
    snapshotsResponse.data.length,
    3,
  );
  // 8. Validate sorting order (created_at descending - newest first)
  TestValidator.predicate("snapshots sorted by created_at descending", () => {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      if (
        snapshotsResponse.data[i].created_at <
        snapshotsResponse.data[i + 1].created_at
      ) {
        return false;
      }
    }
    return true;
  });
  // 9. Validate first snapshot (most recent)
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "first snapshot title matches third edit",
    firstSnapshot.title,
    thirdEditTitle,
  );
  const thirdUpdateContent = typia.assert<{ post_type: "text"; body: string }>(
    thirdUpdate.content,
  );
  TestValidator.equals(
    "first snapshot text_body matches third edit",
    firstSnapshot.text_body,
    thirdUpdateContent.body,
  );
  TestValidator.equals(
    "first snapshot post_type is text",
    firstSnapshot.post_type,
    "text",
  );
  TestValidator.equals(
    "first snapshot has correct vote_score",
    firstSnapshot.vote_score,
    post.vote_score,
  );
  TestValidator.equals(
    "first snapshot has correct comment_count",
    firstSnapshot.comment_count,
    post.comment_count,
  );
  // 10. Validate edited_by_member relationship
  TestValidator.equals(
    "edited_by_member username matches author",
    firstSnapshot.edited_by_member.username,
    post.author.username,
  );
  TestValidator.equals(
    "edited_by_member_id matches author id",
    firstSnapshot.edited_by_member_id,
    authorId,
  );
  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records matches data count",
    snapshotsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages is 1",
    snapshotsResponse.pagination.pages,
    1,
  );
}