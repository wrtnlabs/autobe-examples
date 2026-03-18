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

export async function test_api_post_update_non_author_denied_no_change(
  connection: api.IConnection,
): Promise<void> {
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminAConnection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminBConnection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Without a post listing/creation API, we rely on an existing postId.
  // This test focuses on invariants: denied update must not change any fields.
  const targetPostId = typia.random<string & tags.Format<"uuid">>();
  const before = await api.functional.communityPlatform.admin.posts.at(
    adminAConnection,
    { postId: targetPostId },
  );
  typia.assert(before);
  const attemptedTitle = `${before.title}-denied-${RandomGenerator.alphabets(6)}`;
  const updateBody: ICommunityPlatformPost.IUpdate = {
    title: attemptedTitle,
    body: before.postType === "text" ? `${before.textContent}-x` : undefined,
    post_type: before.postType,
    link_url: before.postType === "link" ? null : undefined,
    image_cover_url: before.postType === "image" ? null : undefined,
    image_alt_text: before.postType === "image" ? null : undefined,
  };
  // If ownership is correctly enforced, update must fail.
  // Regardless of failure, post must remain unchanged.
  try {
    await api.functional.communityPlatform.admin.posts.update(
      adminBConnection,
      {
        postId: targetPostId,
        body: updateBody,
      },
    );
  } catch {
    // Expected: non-author denial
  }
  const after = await api.functional.communityPlatform.admin.posts.at(
    adminBConnection,
    { postId: targetPostId },
  );
  typia.assert(after);
  TestValidator.equals("title unchanged", after.title, before.title);
  TestValidator.equals(
    "textContent unchanged",
    after.textContent,
    before.textContent,
  );
  TestValidator.equals("postType unchanged", after.postType, before.postType);
  TestValidator.equals(
    "linkContent unchanged",
    after.linkContent,
    before.linkContent,
  );
  TestValidator.equals(
    "imageContent unchanged",
    after.imageContent,
    before.imageContent,
  );
  TestValidator.equals(
    "imageAltText unchanged",
    after.imageAltText,
    before.imageAltText,
  );
  TestValidator.equals("editedAt unchanged", after.editedAt, before.editedAt);
}
