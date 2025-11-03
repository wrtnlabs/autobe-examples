import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_profile_retrieval_after_registration(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  const registerResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      password: password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });

  typia.assert(registerResponse);

  // Step 2: Retrieve the authenticated member's profile using the connection with auth token
  const memberProfile =
    await api.functional.discussionBoard.member.me.profile(connection);

  typia.assert(memberProfile);

  // Step 3: Validate that profile information matches registration and contains required fields
  TestValidator.equals(
    "profile id matches registered member id",
    memberProfile.id,
    registerResponse.id,
  );
  TestValidator.equals(
    "profile email matches registered email",
    memberProfile.email,
    email,
  );

  // Verify account status is active for newly registered members
  TestValidator.equals(
    "newly registered account status is active",
    memberProfile.account_status,
    "active",
  );

  // Verify timestamps are present and valid ISO 8601 format
  TestValidator.predicate(
    "profile created_at is valid ISO 8601 datetime",
    () => {
      const createdDate = new Date(memberProfile.created_at);
      return !isNaN(createdDate.getTime());
    },
  );

  TestValidator.predicate(
    "profile updated_at is valid ISO 8601 datetime",
    () => {
      const updatedDate = new Date(memberProfile.updated_at);
      return !isNaN(updatedDate.getTime());
    },
  );

  // Verify active accounts have no deletion timestamp
  TestValidator.predicate(
    "active account deleted_at is null or undefined",
    () => {
      return (
        memberProfile.deleted_at === null ||
        memberProfile.deleted_at === undefined
      );
    },
  );

  // Verify created_at timestamp is recent (within 10 seconds of registration)
  const now = new Date();
  const createdTime = new Date(memberProfile.created_at);
  const timeDifference = now.getTime() - createdTime.getTime();
  TestValidator.predicate(
    "created_at timestamp is recent",
    () => timeDifference >= 0 && timeDifference < 10000,
  );
}
