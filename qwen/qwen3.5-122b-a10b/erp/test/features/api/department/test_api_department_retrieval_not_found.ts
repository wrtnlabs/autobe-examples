import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate random UUIDs for non-existent organization and department
  const nonExistentOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentDepartmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent department and validate 404 error
  await TestValidator.httpError(
    "department not found returns 404",
    404,
    async () => {
      await api.functional.hrm.member.organizations.departments.at(
        memberConnection,
        {
          organizationId: nonExistentOrganizationId,
          departmentId: nonExistentDepartmentId,
        },
      );
    },
  );
}
