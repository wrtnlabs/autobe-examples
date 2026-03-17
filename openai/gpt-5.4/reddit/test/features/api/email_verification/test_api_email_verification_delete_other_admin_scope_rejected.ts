import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_email_verification_delete_other_admin_scope_rejected(
  connection: api.IConnection,
): Promise<void> {
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdminJoin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const firstAdmin: ICommunityPlatformAdmin.IAuthorized =
    typia.assert(firstAdminJoin);
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdminJoin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const secondAdmin: ICommunityPlatformAdmin.IAuthorized =
    typia.assert(secondAdminJoin);
  TestValidator.notEquals(
    "different admins must be created",
    firstAdmin.id,
    secondAdmin.id,
  );
  TestValidator.notEquals(
    "different admin emails must be used",
    firstAdmin.email,
    secondAdmin.email,
  );
  const outsiderEmailVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "other-admin email verification deletion must be rejected",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.admin.email_verifications.erase(
        secondAdminConnection,
        {
          emailVerificationId: outsiderEmailVerificationId,
        },
      );
    },
  );
}
