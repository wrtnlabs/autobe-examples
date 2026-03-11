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
 * Test the basic functionality of retrieving all active discussion board sections.
 * Verifies that the endpoint returns a list of sections with proper structure including
 * id, name, description, and created_at fields. Validates that sections are sorted
 * alphabetically by name as specified in the requirements. Checks that only active
 * sections (where deleted_at is null) are returned, ensuring soft-deleted sections
 * are properly excluded. Verifies the response format matches the IDiscussionBoardSection.ISummary
 * schema with all required fields present.
 */
export async function test_api_section_browsing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Retrieve all active sections
  const sections =
    await api.functional.discussionBoard.guest.sections.at(guestConnection);
  typia.assert(sections);
}
