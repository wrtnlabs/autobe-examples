import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a guest record by unique identifier.
 *
 * This test verifies that:
 * 1. Member can authenticate via join endpoint
 * 2. Guest retrieval endpoint returns valid guest data
 * 3. Response structure is valid (validated by typia.assert)
 * 4. deleted_at field is null for active guests
 */
export async function test_api_guest_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate guest ID for retrieval
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve guest record
  const guest: IErpHrmGuest = await api.functional.erpHrm.member.guests.at(
    memberConnection,
    { guestId },
  );
  typia.assert(guest);
  // 4. Validate business logic: active guests should have deleted_at as null
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest.deleted_at,
    null,
  );
}
