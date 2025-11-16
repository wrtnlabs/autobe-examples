import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

/**
 * This E2E test validates the full flow of retrieving detailed information of a
 * specific EconPolDiscussionBoard guest by their guestId. First, it creates a
 * new guest record with valid username, IP address, user agent, current page
 * URL, and referrer URL. It confirms that the creation succeeded and the
 * returned guest data matches expectations, including valid UUID format for id
 * and ISO date-time for creation and update timestamps. Next, using the
 * returned guest's id, the test fetches the detailed guest information and
 * validates the response to ensure all required fields (id, username, ip,
 * user_agent, created_at, updated_at) are present and of correct format. The
 * test confirms that fetching guest details by a non-existent guestId results
 * in an error, confirming server behavior for missing resources. The endpoint
 * is publicly accessible with no authentication required, so no login steps
 * precede the test. The test uses typia.random with appropriate tagging for
 * generating realistic test data for fields such as username, IP, URIs, and
 * user agent strings. All response data undergoes typia.assert for strict
 * runtime type validation. TestValidator is used to assert expected results and
 * error scenarios with explicit meaningful titles. Every API call uses await
 * for proper asynchronous operation handling.
 */
export async function test_api_econ_pol_discussion_board_guest_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create a new guest user
  const guestCreateBody = {
    username: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 15,
    }),
    href: `https://example.com/page/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/home/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;

  const createdGuest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(createdGuest);

  // Validate created guest fields
  TestValidator.predicate(
    "created guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdGuest.id,
    ),
  );
  TestValidator.equals(
    "created guest username matches",
    createdGuest.username,
    guestCreateBody.username,
  );

  // 2. Retrieve detail info by guestId
  const retrievedGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.at(
      connection,
      { guestId: createdGuest.id },
    );
  typia.assert(retrievedGuest);

  // Validate retrieved guest matches created guest
  TestValidator.equals(
    "retrieved guest id matches created guest id",
    retrievedGuest.id,
    createdGuest.id,
  );
  TestValidator.equals(
    "retrieved guest username matches created username",
    retrievedGuest.username,
    createdGuest.username,
  );
  TestValidator.equals(
    "retrieved guest ip matches",
    retrievedGuest.ip ?? null,
    createdGuest.ip ?? null,
  );
  TestValidator.equals(
    "retrieved guest user_agent matches",
    retrievedGuest.user_agent ?? null,
    createdGuest.user_agent ?? null,
  );

  // 3. Test retrieval with non-existent guestId produces error
  await TestValidator.error(
    "fetching non-existent guestId should fail",
    async () => {
      await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.at(
        connection,
        {
          guestId: typia.random<string & tags.Format<"uuid">>(), // random UUID presumed non-existent
        },
      );
    },
  );
}
