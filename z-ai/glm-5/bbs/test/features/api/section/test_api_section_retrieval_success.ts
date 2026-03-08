import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an unauthenticated guest can successfully retrieve a section by its unique identifier.
 *
 * Prerequisites:
 * 1. Create an admin account and authenticate
 * 2. Create a section via admin endpoint
 *
 * Test Steps:
 * 1. As an unauthenticated guest, send GET request to /discussionBoard/sections/{sectionId}
 * 2. Validate the response contains correct section data
 * 3. Verify all fields match the created section data
 * 4. Confirm no authentication headers are required for this public endpoint
 */
export async function test_api_section_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a section as admin using the generation utility
  const createdSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {},
    );
  typia.assert(createdSection);
  // 3. Create guest connection (no auth) and retrieve the section
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    guestConnection,
    { sectionId: createdSection.id },
  );
  typia.assert(retrievedSection);
  // 4. Validate all fields match the created section
  TestValidator.equals("section id", retrievedSection.id, createdSection.id);
  TestValidator.equals(
    "section name",
    retrievedSection.name,
    createdSection.name,
  );
  TestValidator.equals(
    "section description",
    retrievedSection.description,
    createdSection.description,
  );
  TestValidator.equals(
    "section sequence",
    retrievedSection.sequence,
    createdSection.sequence,
  );
  // 5. Validate creator details match
  TestValidator.equals(
    "creator id",
    retrievedSection.creator.id,
    createdSection.creator.id,
  );
  TestValidator.equals(
    "creator email",
    retrievedSection.creator.email,
    createdSection.creator.email,
  );
  TestValidator.equals(
    "creator displayName",
    retrievedSection.creator.displayName,
    createdSection.creator.displayName,
  );
  TestValidator.equals(
    "creator grade",
    retrievedSection.creator.grade,
    createdSection.creator.grade,
  );
  TestValidator.equals(
    "creator banned",
    retrievedSection.creator.banned,
    createdSection.creator.banned,
  );
  // 6. Validate timestamps
  TestValidator.equals(
    "createdAt",
    retrievedSection.createdAt,
    createdSection.createdAt,
  );
  TestValidator.equals(
    "updatedAt",
    retrievedSection.updatedAt,
    createdSection.updatedAt,
  );
}
