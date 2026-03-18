import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_reject_when_post_invalid_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member
  const memberConnectionBase: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...(memberConnectionBase.headers ?? {}),
  };
  // 2) Use an invalid/deleted target postId (cannot obtain id from posts.create because it returns void)
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();
  // 3) Attempt to vote; must be rejected because the post is not valid for normal viewing contexts
  await TestValidator.httpError(
    "vote should be rejected for invalid/deleted post target",
    [400, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.posts.votes.updatePostVote(
        memberConnection,
        {
          postId: invalidPostId,
          body: {
            voteDirection: "upvote",
          } satisfies ICommunityPlatformPostVote.IRequest,
        },
      );
    },
  );
}
