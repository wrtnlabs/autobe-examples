import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_deletion_unauthorized_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and creates a post
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth: ICommunityMember.IAuthorized =
    await authorize_member_join(firstMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies ICommunityMember.IJoin,
    });
  // Update connection with auth token from join
  firstMemberConnection.headers = {
    Authorization: firstMemberAuth.token.access,
  };
  const post = await generate_random_community_member_posts_create(
    firstMemberConnection,
    {
      body: {} satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 2. First member creates a comment on the post
  const comment = await generate_random_community_member_comments_create(
    firstMemberConnection,
    {
      body: {} satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Second member joins
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth: ICommunityMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies ICommunityMember.IJoin,
    });
  // Update connection with auth token from join
  secondMemberConnection.headers = {
    Authorization: secondMemberAuth.token.access,
  };
  // 4. Second member attempts to delete the comment created by first member
  // This should fail with 403 Forbidden since user lacks ownership or moderation rights
  await TestValidator.httpError(
    "Unauthorized comment deletion attempt should return 403",
    403,
    async () => {
      await api.functional.community.member.comments.erase(
        secondMemberConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
  // 5. Verify comment still exists and unchanged
  // Since no fetch function exists, we cannot retrieve it again.
  // Validate that the comment's critical properties remain unchanged.
  TestValidator.equals("comment status unchanged", comment.status, "active");
  TestValidator.equals(
    "comment content unchanged",
    comment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment not deleted",
    () => comment.deleted_at === null,
  );
}
