import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
export async function test_api_super_administrator_grade_change_record_soft_delete_audit_access(connection: api.IConnection): Promise<void> {
    // 1. Setup - Authentication for multiple actors
    const auditorConnection: api.IConnection = { host: connection.host };
    const gradeChangerConnection: api.IConnection = { host: connection.host };
    const adminConnection: api.IConnection = { host: connection.host };
    const auditor = await authorize_super_administrator_join(auditorConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(2),
            password: "12345678",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(auditor);
    const gradeChanger = await authorize_super_administrator_join(gradeChangerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(2),
            password: "12345678",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(gradeChanger);
    const regularAdmin = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(2),
            password: "12345678",
            grade: "regular",
        },
    });
    typia.assert(regularAdmin);
    // 2. Generate mock grade change record data using typia.random
    // Note: Actual grade change creation requires an endpoint not available in SDK
    const gradeChangeId = typia.random<string & tags.Format<"uuid">>();
    // 3. Test accessing the grade change record as auditor (with audit override privileges)
    const gradeChangeRecord = await api.functional.ecommerceMall.superAdministrator.administrator_grades.at(auditorConnection, { gradeChangeId });
    typia.assert(gradeChangeRecord);
    // 4. Validate the record structure
    TestValidator.equals("record has admin reference", gradeChangeRecord.administrator_id, regularAdmin.id);
    TestValidator.equals("record has changer reference", gradeChangeRecord.changed_by, gradeChanger.superAdministrator.id);
    TestValidator.equals("record has grade change", gradeChangeRecord.grade, "super");
    TestValidator.equals("record has previous grade", gradeChangeRecord.previous_grade, "regular");
    // 5. Verify nested administrator data
    TestValidator.equals("nested admin ID matches", gradeChangeRecord.administrator.id, regularAdmin.id);
    TestValidator.equals("nested admin display name", gradeChangeRecord.administrator.displayName, regularAdmin.display_name);
    TestValidator.equals("nested admin grade", gradeChangeRecord.administrator.grade, "regular");
    TestValidator.equals("nested changer ID matches", gradeChangeRecord.changedBy.id, gradeChanger.superAdministrator.id);
    TestValidator.equals("nested changer display name", gradeChangeRecord.changedBy.displayName, gradeChanger.superAdministrator.display_name);
    TestValidator.equals("nested changer grade", gradeChangeRecord.changedBy.grade, "super");
    // 6. Verify timestamps are properly formatted
    TestValidator.predicate("created_at is valid datetime", () => !isNaN(Date.parse(gradeChangeRecord.created_at)));
    TestValidator.predicate("updated_at is valid datetime", () => !isNaN(Date.parse(gradeChangeRecord.updated_at)));
    // 7. Validate soft-deleted status field exists
    // deleted_at should be nullable to support soft-delete pattern
    const deletedAt: (string & tags.Format<"date-time">) | null | undefined = gradeChangeRecord.deleted_at;
    TestValidator.predicate("deleted_at field exists", deletedAt !== undefined);
}