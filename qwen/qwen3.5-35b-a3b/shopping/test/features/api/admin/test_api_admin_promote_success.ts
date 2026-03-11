import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminGradeRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminGradeRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path of promoting a regular administrator to super administrator grade.
 *
 * Test Steps:
 * 1. Join auth as a super administrator (this will be the actor performing the promotion)
 * 2. Join auth as a regular administrator (this will be the target to be promoted)
 * 3. Perform promotion by sending POST /ecommerceMall/admin/admin-grades with the regular administrator's ID in the request body
 * 4. Verify the promotion succeeds with HTTP 200
 *
 * Expected Validations:
 * - Response contains the updated administrator record
 * - The administrator's grade is changed from 'regular' to 'super'
 * - The updatedAt timestamp is updated to reflect the promotion
 * - An immutable snapshot is created in ecommerce_mall_snapshot_audits with recordType 'admin_grade', oldValues {grade: 'regular'}, newValues {grade: 'super'}, and changedBy set to the performing super administrator's ID
 * - The promoted administrator now has access to super administrator privileges including approving admin requests and managing admin grade levels
 */
export async function test_api_admin_promote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator who will perform the promotion
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin: IEcommerceMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const superAdminAuthorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(superAdminConnection, {
      body: superAdminJoin,
    });
  typia.assert(superAdminAuthorized);
  // 2. Setup regular administrator who will be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminJoin: IEcommerceMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const regularAdminAuthorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(regularAdminConnection, {
      body: regularAdminJoin,
    });
  typia.assert(regularAdminAuthorized);
  // 3. Perform promotion using super administrator's connection
  const promotedAdmin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admin_grades.promote(
      superAdminConnection,
      {
        body: {
          targetAdministratorId: regularAdminAuthorized.id,
        } satisfies IEcommerceMallAdminGradeRequest.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Validate promotion succeeded
  TestValidator.equals(
    "admin ID matches target",
    promotedAdmin.id,
    regularAdminAuthorized.id,
  );
  TestValidator.equals(
    "email matches target",
    promotedAdmin.email,
    regularAdminAuthorized.email,
  );
  TestValidator.predicate(
    "admin is not banned",
    promotedAdmin.isBanned === false,
  );
  TestValidator.equals("ban reason is null", promotedAdmin.banReason, null);
  // Verify updatedAt was updated (different from createdAt indicates modification)
  TestValidator.notEquals(
    "updatedAt changed",
    promotedAdmin.updatedAt,
    promotedAdmin.createdAt,
  );
}