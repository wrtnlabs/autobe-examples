import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_update_post_link";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_preview_fields_update_reflected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-123!",
    } satisfies ICommunityPlatformMember.IJoin,
  });

  const href1 = typia.random<string & tags.Format<"uri">>();
  const initialTitle = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const communityId = typia.random<string & tags.Format<"uuid">>();

  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        post_type: "link",
        title: RandomGenerator.name(),
        link: {
          href: href1,
          display_title: initialTitle,
          display_description: initialDescription,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const postId = typia.random<string & tags.Format<"uuid">>();

  const href2 = typia.random<string & tags.Format<"uri">>();
  const updatedTitle = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost =
    await generate_random_community_platform_member_posts_link_update_post_link(
      memberConnection,
      {
        params: { postId },
        body: {
          href: href2,
          displayTitle: updatedTitle,
          displayDescription: updatedDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedPost);

  const link = await api.functional.communityPlatform.member.posts.link.at(
    memberConnection,
    { postId },
  );
  typia.assert(link);

  TestValidator.equals("href reflects update", link.href, href2);
  TestValidator.equals(
    "display_title reflects update",
    link.display_title,
    updatedTitle,
  );
  TestValidator.equals(
    "display_description reflects update",
    link.display_description,
    updatedDescription,
  );
  TestValidator.equals("deleted_at is null", link.deleted_at, null);
  typia.assert<ICommunityPlatformPostLink>(link);
}
