import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test section browsing when no sections exist in the system.
 *
 * This test verifies that the guest sections endpoint returns an empty array
 * when no discussion board sections have been created, ensuring proper handling
 * of empty states for new installations or systems without configured sections.
 */
export async function test_api_section_browsing_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Call the sections endpoint to retrieve all sections
  const sections =
    await api.functional.discussionBoard.guest.sections.at(guestConnection);
  // Validate the response structure
  typia.assert(sections);
  // Verify that the response is an empty array
  TestValidator.equals("sections should be empty array", sections as any, []);
}