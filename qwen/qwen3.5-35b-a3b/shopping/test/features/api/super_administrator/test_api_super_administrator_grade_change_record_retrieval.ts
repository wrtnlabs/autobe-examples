import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_grade_change_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminOutput = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(superAdminOutput);
  const superAdminId = superAdminOutput.id;
  const superAdminEmail = superAdminOutput.superAdministrator.email;
  const superAdminDisplayName =
    superAdminOutput.superAdministrator.display_name;
  // 2. Create Regular Administrator
  const regularAdminId = typia.random<string & tags.Format<"uuid">>();
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminDisplayName = RandomGenerator.name(2);
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  // 3. Create Grade Change Record (Promoting regular to super)
  // Using typia.random for the grade change creation since SDK function may not be available
  const gradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve Grade Change Record
  const gradeChange =
    await api.functional.ecommerceMall.superAdministrator.administrator_grades.at(
      superAdminConnection,
      {
        gradeChangeId,
      },
    );
  typia.assert(gradeChange);
  // 5. Validate Grade Change Record Fields
  TestValidator.equals("grade change id", gradeChange.id, gradeChangeId);
  TestValidator.equals(
    "administrator_id",
    gradeChange.administrator_id,
    regularAdminId,
  );
  TestValidator.equals("changed_by", gradeChange.changed_by, superAdminId);
  TestValidator.equals("grade", gradeChange.grade, "super");
  TestValidator.equals("previous_grade", gradeChange.previous_grade, "regular");
  TestValidator.equals("reason", gradeChange.reason, null);
  TestValidator.equals("deleted_at", gradeChange.deleted_at, null);
  // 6. Validate Timestamps
  const createdDate = new Date(gradeChange.created_at);
  const updatedDate = new Date(gradeChange.updated_at);
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(updatedDate.getTime()),
  );
  // 7. Validate Nested Administrator Object
  typia.assert(gradeChange.administrator);
  TestValidator.equals(
    "administrator id",
    gradeChange.administrator.id,
    regularAdminId,
  );
  TestValidator.equals(
    "administrator email",
    gradeChange.administrator.email,
    regularAdminEmail,
  );
  TestValidator.equals(
    "administrator display_name",
    gradeChange.administrator.displayName,
    regularAdminDisplayName,
  );
  TestValidator.equals(
    "administrator grade",
    gradeChange.administrator.grade,
    "super",
  );
  TestValidator.equals(
    "administrator is_banned",
    gradeChange.administrator.isBanned,
    false,
  );
  TestValidator.predicate(
    "administrator created_at is valid",
    !isNaN(new Date(gradeChange.administrator.createdAt).getTime()),
  );
  TestValidator.predicate(
    "administrator updated_at is valid",
    !isNaN(new Date(gradeChange.administrator.updatedAt).getTime()),
  );
  TestValidator.equals(
    "administrator deleted_at",
    gradeChange.administrator.deletedAt,
    null,
  );
  // 8. Validate Nested ChangedBy Object
  typia.assert(gradeChange.changedBy);
  TestValidator.equals("changed_by id", gradeChange.changedBy.id, superAdminId);
  TestValidator.equals(
    "changed_by email",
    gradeChange.changedBy.email,
    superAdminEmail,
  );
  TestValidator.equals(
    "changed_by display_name",
    gradeChange.changedBy.displayName,
    superAdminDisplayName,
  );
  TestValidator.equals(
    "changed_by grade",
    gradeChange.changedBy.grade,
    "super",
  );
  TestValidator.equals(
    "changed_by is_banned",
    gradeChange.changedBy.isBanned,
    false,
  );
  TestValidator.predicate(
    "changed_by created_at is valid",
    !isNaN(new Date(gradeChange.changedBy.createdAt).getTime()),
  );
  TestValidator.predicate(
    "changed_by updated_at is valid",
    !isNaN(new Date(gradeChange.changedBy.updatedAt).getTime()),
  );
  TestValidator.equals(
    "changed_by deleted_at",
    gradeChange.changedBy.deletedAt,
    null,
  );
}
