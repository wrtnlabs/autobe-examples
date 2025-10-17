import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";

export async function test_api_guest_details_retrieval_by_valid_id(
  connection: api.IConnection,
) {
  // Authenticate admin to access guest details
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Generate a valid guest UUID
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve guest details
  const guest: IEconomicBoardGuest =
    await api.functional.economicBoard.guests.at(connection, {
      guestId,
    });
  typia.assert(guest);

  // Validate that the guest ID matches the requested ID (business verification)
  TestValidator.equals("guest ID matches requested ID", guest.id, guestId);
}
