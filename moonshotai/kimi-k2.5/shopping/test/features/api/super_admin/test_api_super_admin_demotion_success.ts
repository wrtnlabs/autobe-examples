import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create superAdmin1 (the requester who will perform the demotion)
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/register",
        referrer: "https://test.com",
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin1);
  // Step 2: Create superAdmin2 (the target to be demoted)
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/register",
        referrer: "https://test.com",
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin2);
  // Step 3: Retrieve list of super administrators to verify superAdmin2 exists
  const superAdminsList =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdmin1Connection,
      {
        body: {
          grade: "super_admin",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminsList);
  const foundAdmin = superAdminsList.data.find(
    (admin) => admin.id === superAdmin2.id,
  );
  TestValidator.predicate(
    "target super administrator exists in list",
    foundAdmin !== undefined,
  );
  // Step 4: Demote superAdmin2 to regular administrator
  const demotedAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.update(
      superAdmin1Connection,
      {
        superAdminId: superAdmin2.id,
        body: {
          grade: "regular",
        } satisfies IEcommerceMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(demotedAdmin);
  // Step 5 & 6: Validate the demotion response
  TestValidator.equals(
    "demoted admin ID matches target",
    demotedAdmin.id,
    superAdmin2.id,
  );
  TestValidator.equals(
    "grade changed to regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals(
    "email preserved",
    demotedAdmin.email,
    superAdmin2.email,
  );
  TestValidator.predicate("account is active", demotedAdmin.deletedAt === null);
  TestValidator.predicate(
    "updatedAt timestamp is recent",
    new Date(demotedAdmin.updatedAt) > new Date(superAdmin2.createdAt),
  );
}
