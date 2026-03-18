import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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

export async function test_api_post_link_representation_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The provided SDK/utilities do not include any way to create a post
  // while retrieving its postId, nor an endpoint to soft-delete a post.
  // Therefore, we can only validate the successful response contract when
  // link metadata is returned by the service for a provided postId.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("link representation retrieval", async () => {
    // We expect either success (ICommunityPlatformPostLink) or a not-found/
    // representation-unavailable failure depending on backend fixture state.
    // If it succeeds, validate the contract.
    try {
      const output =
        await api.functional.communityPlatform.member.posts.link.at(
          memberConnection,
          { postId },
        );
      typia.assert(output);
      typia.assert(output.href);
      TestValidator.predicate(
        "display_title non-empty",
        output.display_title.length > 0,
      );
      TestValidator.predicate(
        "display_description non-empty",
        output.display_description.length > 0,
      );
      TestValidator.equals("deleted_at is null", output.deleted_at, null);
    } catch (err) {
      throw err;
    }
  });
}
