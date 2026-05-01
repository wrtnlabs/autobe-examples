import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that requesting a non-existent timelog returns 404 Not Found.
 *
 * Validates that the timelog retrieval endpoint correctly handles requests for timelogs that do not exist. After registering and authenticating a new member, the test requests a timelog using a randomly generated UUID that does not correspond to any existing timelog record in the system. The endpoint must reject the request with an error, confirming that invalid timelog IDs are handled correctly and that no information about existing records is leaked.
 *
 * 1. Register and authenticate a new member via the join endpoint.
 * 2. Generate a random UUID that does not match any existing timelog.
 * 3. Request the non-existent timelog via the retrieval endpoint.
 * 4. Verify the request fails with an error response.
 */
export async function test_api_timelog_retrieve_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt to retrieve a non-existent timelog
  await TestValidator.error("non-existent timelog returns error", async () => {
    await api.functional.erpHrm.member.timelogs.at(memberConnection, {
      timelogId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
