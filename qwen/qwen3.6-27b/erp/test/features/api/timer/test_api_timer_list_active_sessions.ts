import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary workflow of listing active timer sessions for the authenticated employee.
 *
 * The member joins and receives authorization tokens. The test verifies that the timer listing endpoint returns a paginated response. Since no timers exist yet, this validates the empty result state with proper pagination metadata (current page, total records set to 0, pages set to 0). The response structure includes the pagination object and empty data array, confirming the endpoint returns proper pagination format even when no timers exist. This validates the baseline behavior before timers are created.
 *
 * 1. Member joins and receives authorization tokens.
 * 2. Member calls the timer listing endpoint.
 * 3. Validates the empty result state with proper pagination metadata.
 */
export async function test_api_timer_list_active_sessions(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. List timers
  const timers = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(timers);
  // 3. Validate empty result state
  TestValidator.equals("total records is 0", timers.pagination.records, 0);
  TestValidator.equals("total pages is 0", timers.pagination.pages, 0);
  TestValidator.equals("data array is empty", timers.data.length, 0);
}
