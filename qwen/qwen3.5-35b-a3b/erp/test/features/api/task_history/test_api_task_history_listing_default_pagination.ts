import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: "KRW",
        org_description: RandomGenerator.paragraph({ sentences: 1 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
    });
  typia.assert(memberAuth);
  // 2. Call task history endpoint with empty body (default pagination)
  // memberConnection was updated internally by authorize_member_join
  const response: IPageIHrmPlatformTaskHistory.ISummary =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  const { pagination, data } = response;
  TestValidator.equals(
    "pagination metadata has current field",
    typeof pagination.current, // eslint-disable-line @typescript-eslint/no-unsafe-argument
    "number",
  );
  TestValidator.equals(
    "pagination metadata has limit field",
    typeof pagination.limit, // eslint-disable-line @typescript-eslint/no-unsafe-argument
    "number",
  );
  TestValidator.equals(
    "pagination metadata has records field",
    typeof pagination.records, // eslint-disable-line @typescript-eslint/no-unsafe-argument
    "number",
  );
  TestValidator.equals(
    "pagination metadata has pages field",
    typeof pagination.pages, // eslint-disable-line @typescript-eslint/no-unsafe-argument
    "number",
  );
  // 4. Validate data is array
  TestValidator.equals("data is array", Array.isArray(data), true);
  // 5. Validate each history entry structure if records exist
  if (data.length > 0) {
    await ArrayUtil.asyncForEach(
      data,
      async (entry: IHrmPlatformTaskHistory.ISummary) => {
        typia.assert(entry);
        // Validate entry has id
        TestValidator.equals("entry has id", typeof entry.id, "string");
        // Validate task reference
        typia.assert(entry.task);
        TestValidator.equals("task has id", typeof entry.task.id, "string");
        TestValidator.equals(
          "task has title",
          typeof entry.task.title,
          "string",
        );
        TestValidator.equals(
          "task has status",
          typeof entry.task.status,
          "string",
        );
        TestValidator.equals(
          "task has priority",
          typeof entry.task.priority,
          "string",
        );
        TestValidator.equals(
          "task has created_at",
          typeof entry.task.created_at,
          "string",
        );
        typia.assert(entry.task.project);
        TestValidator.equals(
          "project has id",
          typeof entry.task.project.id,
          "string",
        );
        // Validate actor reference
        typia.assert(entry.actor);
        TestValidator.equals("actor has id", typeof entry.actor.id, "string");
        TestValidator.equals(
          "actor has email",
          typeof entry.actor.email,
          "string",
        );
        TestValidator.equals(
          "actor has is_active",
          typeof entry.actor.is_active,
          "boolean",
        );
        TestValidator.equals(
          "actor has created_at",
          typeof entry.actor.created_at,
          "string",
        );
        // Validate action fields
        TestValidator.equals(
          "entry has action_type",
          typeof entry.action_type,
          "string",
        );
        TestValidator.equals(
          "entry has changed_at",
          typeof entry.changed_at,
          "string",
        );
        TestValidator.equals(
          "entry has created_at",
          typeof entry.created_at,
          "string",
        );
        // status_before/status_after/details can be null
        TestValidator.equals(
          "entry has status_before field",
          typeof entry.status_before,
          "object",
        ); // string | null
        TestValidator.equals(
          "entry has status_after field",
          typeof entry.status_after,
          "object",
        ); // string | null
        TestValidator.equals(
          "entry has details field",
          typeof entry.details,
          "object",
        ); // string | null
      },
    );
  }
}
