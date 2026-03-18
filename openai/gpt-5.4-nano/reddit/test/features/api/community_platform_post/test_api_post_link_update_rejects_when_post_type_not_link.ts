import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_link_update_rejects_when_post_type_not_link(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (required to execute admin endpoint)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2) Attempt to update link metadata for a post.
  // We don't have any SDK endpoints here to create/fetch posts with a specific postType,
  // so we pass an arbitrary UUID and validate the request is rejected.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    href: typia.random<string & tags.MinLength<1> & tags.Format<"uri">>(),
    display_title: RandomGenerator.name(),
    display_description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformPost.IUpdateLink;
  await TestValidator.error(
    "reject link update when postType is not link",
    async () => {
      await api.functional.communityPlatform.admin.posts.link.updateLink(
        adminConnection,
        {
          postId,
          body,
        },
      );
    },
  );
}
