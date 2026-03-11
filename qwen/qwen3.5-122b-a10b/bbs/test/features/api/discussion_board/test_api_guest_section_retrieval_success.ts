import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test guest section retrieval success.
 *
 * Verifies that an authenticated guest can successfully retrieve detailed information
 * about an existing, active discussion board section. The test validates:
 * 1. Guest authentication via join operation
 * 2. Section retrieval by UUID
 * 3. Complete response structure including creator attribution
 * 4. Active section status (deleted_at is null)
 * 5. All timestamp fields in ISO 8601 format
 */
export async function test_api_guest_section_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        deviceFingerprint: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(guestAuth);
  // 2. Generate a random section UUID to retrieve
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the section
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.guest.sections.at(guestConnection, {
      sectionId,
    });
  typia.assert(section);
  // 4. Validate section structure
  TestValidator.equals(
    "section id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      section.id,
    ),
    true,
  );
  TestValidator.predicate("section has name", section.name.length > 0);
  TestValidator.predicate(
    "section name is string",
    typeof section.name === "string",
  );
  // Description can be null or string
  TestValidator.predicate(
    "description is valid",
    section.description === null || typeof section.description === "string",
  );
  // 5. Validate creator information
  TestValidator.predicate("creator has id", section.creator.id.length > 0);
  TestValidator.predicate(
    "creator display_name exists",
    section.creator.display_name.length > 0,
  );
  TestValidator.predicate(
    "creator grade exists",
    section.creator.grade.length > 0,
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      section.updated_at,
    ),
  );
  // 7. Verify active section (deleted_at must be null)
  TestValidator.equals(
    "section is active (deleted_at is null)",
    section.deleted_at,
    null,
  );
}
