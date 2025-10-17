import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";

/**
 * Tests member session filtering by device type functionality.
 *
 * This test validates that members can filter their session list by device type
 * to identify sessions from specific device categories (Desktop, Mobile,
 * Tablet).
 *
 * Test workflow:
 *
 * 1. Register a new member account - this creates the initial session
 * 2. Retrieve sessions without filter to get baseline data
 * 3. Apply device_type filter matching the current session's device
 * 4. Validate that filtered results contain only matching device types
 * 5. Test pagination with filtered results
 * 6. Verify empty results when filtering for non-existent device type
 */
export async function test_api_member_sessions_filtering_by_device_type(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const registrationData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(authorizedMember);

  // Step 2: Retrieve all sessions without filter to understand baseline
  const allSessionsRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSession.IRequest;

  const allSessionsPage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authorizedMember.id,
        body: allSessionsRequest,
      },
    );
  typia.assert(allSessionsPage);

  // Validate pagination structure
  TestValidator.predicate(
    "sessions page should have data",
    allSessionsPage.data.length > 0,
  );

  // Get the device type from the first session (created during registration)
  const currentSession = allSessionsPage.data[0];
  typia.assert(currentSession);
  const currentDeviceType = currentSession.device_type;

  // Step 3: Apply device_type filter for the current session's device type
  const filteredRequest = {
    device_type: currentDeviceType,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSession.IRequest;

  const filteredPage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authorizedMember.id,
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);

  // Step 4: Validate that filtered results only contain matching device types
  TestValidator.predicate(
    "filtered page should have data",
    filteredPage.data.length > 0,
  );

  for (const session of filteredPage.data) {
    TestValidator.equals(
      "session device type should match filter",
      session.device_type,
      currentDeviceType,
    );
  }

  // Step 5: Test pagination metadata with filtered results
  TestValidator.predicate(
    "filtered results should have valid pagination",
    filteredPage.pagination.current === 1 &&
      filteredPage.pagination.limit === 20 &&
      filteredPage.pagination.records >= 0 &&
      filteredPage.pagination.pages >= 0,
  );

  // Step 6: Test with different device type filter (should return empty or matching results)
  const deviceTypes = ["Desktop", "Mobile", "Tablet"] as const;
  const otherDeviceType =
    deviceTypes.find((dt) => dt !== currentDeviceType) ?? "Mobile";

  const otherDeviceRequest = {
    device_type: otherDeviceType,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSession.IRequest;

  const otherDevicePage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authorizedMember.id,
        body: otherDeviceRequest,
      },
    );
  typia.assert(otherDevicePage);

  // Validate that if there are results, they all match the filter
  for (const session of otherDevicePage.data) {
    TestValidator.equals(
      "other device sessions should match their filter",
      session.device_type,
      otherDeviceType,
    );
  }

  // Step 7: Test with null device_type (should return all sessions)
  const nullFilterRequest = {
    device_type: null,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSession.IRequest;

  const nullFilterPage =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authorizedMember.id,
        body: nullFilterRequest,
      },
    );
  typia.assert(nullFilterPage);

  TestValidator.predicate(
    "null filter should return sessions",
    nullFilterPage.data.length > 0,
  );
}
