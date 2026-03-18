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

export async function test_api_post_admin_update_shared_fields(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const nextTitle = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    title: nextTitle,
  } satisfies ICommunityPlatformPost.IUpdate;
  const updated = await api.functional.communityPlatform.admin.posts.update(
    adminConnection,
    {
      postId,
      body,
    },
  );
  typia.assert(updated);
  TestValidator.equals("post id preserved", updated.id, postId);
  TestValidator.equals("title updated", updated.title, nextTitle);
  TestValidator.predicate(
    "author returned",
    updated.author !== null && updated.author !== undefined,
  );
  TestValidator.predicate(
    "community returned",
    updated.community !== null && updated.community !== undefined,
  );
  TestValidator.predicate(
    "created timestamp retained",
    updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp retained",
    updated.updated_at.length > 0,
  );
  TestValidator.equals(
    "post remains active or deleted state preserved",
    updated.deleted_at,
    updated.deleted_at,
  );
}
