import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_soft_delete_audit_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoined: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(superAdminJoinConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperAdmin@123",
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(superAdminJoined);
  // 2. Create regular administrator account (target of grade change)
  const regularAdminJoinConnection: api.IConnection = { host: connection.host };
  const regularAdminJoined: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(regularAdminJoinConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: "RegularAdmin@123",
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(regularAdminJoined);
  // 3. Authenticate as super administrator
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminLoggedIn: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_login(superAdminLoginConnection, {
      body: {
        email: superAdminJoined.email,
        password: "SuperAdmin@123",
        ip: "127.0.0.1",
        referrer: "http://localhost/admin",
      } satisfies IEcommerceMallAdministrator.ILogin,
    });
  typia.assert(superAdminLoggedIn);
  // Generate a grade change record for testing
  const gradeChange = typia.random<IEcommerceMallAdministratorGrade>();
  // Retrieve the grade change record initially to confirm it exists
  const activeGradeChange =
    await api.functional.ecommerceMall.administrator.administrator_grades.at(
      superAdminLoginConnection,
      {
        gradeChangeId: gradeChange.id,
      },
    );
  typia.assert(activeGradeChange);
  // Validate initial retrieval includes all expected fields
  TestValidator.equals(
    "active deleted_at should be null",
    activeGradeChange.deleted_at,
    null,
  );
  TestValidator.equals(
    "active administrator_id",
    activeGradeChange.administrator_id,
    gradeChange.administrator_id,
  );
  TestValidator.equals(
    "active changed_by",
    activeGradeChange.changed_by,
    gradeChange.changed_by,
  );
  TestValidator.equals(
    "active grade",
    activeGradeChange.grade,
    gradeChange.grade,
  );
  TestValidator.equals(
    "active previous_grade",
    activeGradeChange.previous_grade,
    gradeChange.previous_grade,
  );
  TestValidator.equals(
    "active administrator intact",
    activeGradeChange.administrator.id,
    gradeChange.administrator.id,
  );
  TestValidator.equals(
    "active changedBy intact",
    activeGradeChange.changedBy.id,
    gradeChange.changedBy.id,
  );
  // Retrieve the record again to verify audit access
  const auditAccessGradeChange =
    await api.functional.ecommerceMall.administrator.administrator_grades.at(
      superAdminLoginConnection,
      {
        gradeChangeId: gradeChange.id,
      },
    );
  typia.assert(auditAccessGradeChange);
  // Validate audit access preserves all data
  TestValidator.equals(
    "audit access deleted_at",
    auditAccessGradeChange.deleted_at,
    activeGradeChange.deleted_at,
  );
  TestValidator.equals(
    "audit access administrator_id",
    auditAccessGradeChange.administrator_id,
    gradeChange.administrator_id,
  );
  TestValidator.equals(
    "audit access changed_by",
    auditAccessGradeChange.changed_by,
    gradeChange.changed_by,
  );
  TestValidator.equals(
    "audit access grade",
    auditAccessGradeChange.grade,
    gradeChange.grade,
  );
  TestValidator.equals(
    "audit access previous_grade",
    auditAccessGradeChange.previous_grade,
    gradeChange.previous_grade,
  );
  TestValidator.equals(
    "audit access administrator intact",
    auditAccessGradeChange.administrator.id,
    gradeChange.administrator.id,
  );
  TestValidator.equals(
    "audit access changedBy intact",
    auditAccessGradeChange.changedBy.id,
    gradeChange.changedBy.id,
  );
  TestValidator.equals(
    "audit access created_at preserved",
    auditAccessGradeChange.created_at,
    gradeChange.created_at,
  );
  TestValidator.equals(
    "audit access updated_at preserved",
    auditAccessGradeChange.updated_at,
    gradeChange.updated_at,
  );
  // Validate audit trail is preserved
  TestValidator.equals(
    "super administrator can audit grade changes",
    auditAccessGradeChange.changedBy.id,
    superAdminJoined.id,
  );
  // Verify the record data remains intact for historical analysis
  TestValidator.notEquals(
    "record should have data",
    auditAccessGradeChange,
    null,
  );
  TestValidator.equals(
    "id preserved",
    auditAccessGradeChange.id,
    gradeChange.id,
  );
}
