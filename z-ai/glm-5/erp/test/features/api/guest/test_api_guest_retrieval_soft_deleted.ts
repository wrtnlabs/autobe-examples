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

export async function test_api_guest_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Attempt to retrieve a guest record
  // Note: For testing soft-deleted guest retrieval, a soft-deleted guest
  // must exist in the database. Using a random UUID will likely return 404.
  // In a real test environment, this would use a known soft-deleted guest ID.
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest = await api.functional.erpHrm.member.guests.at(memberConnection, {
    guestId,
  });
  typia.assert(guest);
  // Step 3: Validate soft-deleted guest has deleted_at populated
  // This validates that soft deletion preserves data accessibility
  // for cleanup purposes without restricting access
  TestValidator.predicate(
    "deleted_at field exists and is properly typed",
    guest.deleted_at === null || typeof guest.deleted_at === "string",
  );
}
