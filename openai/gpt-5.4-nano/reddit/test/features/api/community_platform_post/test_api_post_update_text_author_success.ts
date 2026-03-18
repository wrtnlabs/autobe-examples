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

export async function test_api_post_update_text_author_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // PostId must be an existing, non-deleted post authored by the authenticated member.
  // The test harness is expected to supply a valid UUID post id.
  const postId: string & tags.Format<"uuid"> = (process.env
    .E2E_COMMUNITY_PLATFORM_TEXT_POST_ID ?? "") as string & tags.Format<"uuid">;
  const newTitle = RandomGenerator.alphabets(12);
  const newBody = RandomGenerator.paragraph({ sentences: 4 });
  const updateInput = {
    title: newTitle,
    post_type: "text",
    body: newBody,
    link_url: null,
    image_cover_url: null,
    image_alt_text: null,
  } satisfies ICommunityPlatformPost.IUpdate;
  const output = await api.functional.communityPlatform.admin.posts.update(
    adminConnection,
    {
      postId,
      body: updateInput,
    },
  );
  typia.assert(output);
  TestValidator.equals("updated title", output.title, newTitle);
  TestValidator.equals("updated text content", output.textContent, newBody);
  TestValidator.equals("postType is text", output.postType, "text");
  TestValidator.equals("linkContent null for text", output.linkContent, null);
  TestValidator.equals("imageContent null for text", output.imageContent, null);
  TestValidator.equals("imageAltText null for text", output.imageAltText, null);
  TestValidator.predicate("editedAt non-null", output.editedAt !== null);
}
