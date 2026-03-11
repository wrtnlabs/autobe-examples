import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Tests successful retrieval of an existing guest account.
 * 1. Create a guest session using the guest join endpoint to generate a guest record
 * 2. Retrieve the guest details by guest ID
 * 3. Verify all fields are correctly populated: id matches the requested guest ID,
 *    device_fingerprint is a string hash, created_at and updated_at are valid timestamps,
 *    deleted_at is null for active guest accounts
 * 4. Validate response structure matches IDiscussionBoardGuest schema
 */
export async function test_api_guest_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IDiscussionBoardGuest.IJoin>,
  });
  typia.assert(authorizedGuest);
  // 2. Retrieve guest details by ID
  const retrievedGuest = await api.functional.discussionBoard.guests.at(
    connection,
    {
      guestId: authorizedGuest.id,
    },
  );
  typia.assert(retrievedGuest);
  // 3. Validate business logic
  TestValidator.equals(
    "guest ID matches",
    retrievedGuest.id,
    authorizedGuest.id,
  );
  TestValidator.predicate(
    "device_fingerprint is string",
    typeof retrievedGuest.device_fingerprint === "string",
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    retrievedGuest.deleted_at === null,
  );
  // created_at and updated_at are validated by typia.assert (date-time format)
  // Additional check that updated_at is after or equal to created_at
  const createdAt = new Date(retrievedGuest.created_at);
  const updatedAt = new Date(retrievedGuest.updated_at);
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
