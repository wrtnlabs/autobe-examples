import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminGradeChangeLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can retrieve the complete grade change audit trail for an administrator who has been both promoted and demoted, validating the immutable audit log integrity.
 *
 * Validates the complete grade change lifecycle: a regular administrator is created, promoted to super administrator, then used to promote and demote another administrator. The audit trail is queried to verify that both grade change events are recorded immutably with correct fields and chronological ordering.
 *
 * Special attention is given to verifying that records are sorted by createdAt descending, that the administrator and superAdministrator references are correctly populated, and that pagination metadata accurately reflects the total record count.
 *
 * 1. Regular administrator A is created via join.
 * 2. Administrator A is promoted to super administrator via super administrator join, providing admin A's UUID in the administrator_id field.
 * 3. Regular administrator B is created via join.
 * 4. As super administrator A, promote administrator B to super administrator — creates grade change log #1 (previousGrade: 'regular', newGrade: 'super').
 * 5. As super administrator A, demote administrator B back to regular administrator — creates grade change log #2 (previousGrade: 'super', newGrade: 'regular').
 * 6. Query grade change logs for administrator B with default pagination (empty filter body).
 * 7. Validate pagination metadata shows exactly 2 records, sorted newest first.
 * 8. Validate demote record (first) has correct grade transition fields and references.
 * 9. Validate promote record (second) has correct grade transition fields and older timestamp.
 */
export async function test_api_administrator_grade_change_log_full_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular administrator A
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Promote admin A to super administrator by providing admin A's UUID in administrator_id
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_administrator_join(
    superAdminAConnection,
    {
      body: {
        administrator_id: adminA.id,
      },
    },
  );
  typia.assert(superAdminA);
  // Step 3: Create regular administrator B
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // Step 4: As super admin A, promote admin B to super administrator (creates grade change log #1)
  const promoted =
    await api.functional.eCommerceMall.superAdministrator.administrators.promote(
      superAdminAConnection,
      {
        administratorId: adminB.id,
      },
    );
  typia.assert(promoted);
  // Step 5: As super admin A, demote admin B back to regular administrator (creates grade change log #2)
  const demoted =
    await api.functional.eCommerceMall.superAdministrator.administrators.demote(
      superAdminAConnection,
      {
        administratorId: adminB.id,
      },
    );
  typia.assert(demoted);
  // Step 6: Query grade change logs for admin B with default pagination (no filter body fields)
  const page =
    await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
      superAdminAConnection,
      {
        administratorId: adminB.id,
        body: {},
      },
    );
  typia.assert(page);
  // Step 7: Validate pagination metadata
  TestValidator.predicate(
    "pagination.current >= 1",
    page.pagination.current >= 1,
  );
  TestValidator.equals("pagination.records === 2", page.pagination.records, 2);
  TestValidator.predicate("pagination.pages >= 1", page.pagination.pages >= 1);
  TestValidator.predicate("pagination.limit >= 2", page.pagination.limit >= 2);
  // Step 8: Validate data array has exactly 2 records
  TestValidator.equals("data length is 2", page.data.length, 2);
  // Step 9: Validate records are sorted by createdAt descending (newest first)
  TestValidator.predicate(
    "records sorted by createdAt descending (demote before promote)",
    new Date(page.data[0].createdAt).getTime() >
      new Date(page.data[1].createdAt).getTime(),
  );
  // Step 10: Validate first record (demote - newest)
  const demoteRecord = page.data[0];
  TestValidator.equals(
    "demote record: previousGrade is 'super'",
    demoteRecord.previousGrade,
    "super",
  );
  TestValidator.equals(
    "demote record: newGrade is 'regular'",
    demoteRecord.newGrade,
    "regular",
  );
  TestValidator.equals(
    "demote record: administrator.id matches admin B",
    demoteRecord.administrator.id,
    adminB.id,
  );
  // Step 11: Validate second record (promote - oldest)
  const promoteRecord = page.data[1];
  TestValidator.equals(
    "promote record: previousGrade is 'regular'",
    promoteRecord.previousGrade,
    "regular",
  );
  TestValidator.equals(
    "promote record: newGrade is 'super'",
    promoteRecord.newGrade,
    "super",
  );
  TestValidator.equals(
    "promote record: administrator.id matches admin B",
    promoteRecord.administrator.id,
    adminB.id,
  );
  // Step 12: Validate timestamp ordering
  TestValidator.predicate(
    "promote record createdAt is older than demote record createdAt",
    new Date(promoteRecord.createdAt).getTime() <
      new Date(demoteRecord.createdAt).getTime(),
  );
}
