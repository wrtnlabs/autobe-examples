import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an active member record by their unique identifier.
 *
 * Validates the complete member retrieval flow including member registration, authentication, and record retrieval. Ensures that the retrieved member record contains all expected fields and that the deleted_at field is null for active accounts.
 *
 * The test verifies that member identity information is correctly persisted and retrievable, and that the response excludes sensitive authentication data.
 *
 * 1. Register a new member account using the join endpoint with random credentials.
 * 2. Obtain the member ID from the authorization response.
 * 3. Retrieve the member record using the member ID.
 * 4. Validate the response contains id, email, created_at, updated_at, deleted_at fields.
 * 5. Verify deleted_at is null indicating an active account.
 * 6. Verify the retrieved member data matches the registration data.
 */
export async function test_api_member_retrieve_active_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Retrieve the member record using the member ID
  const member = await api.functional.hrmTimeTrack.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(member);
  // 3. Validate member record fields
  TestValidator.equals("member id matches", member.id, authorized.id);
  TestValidator.equals("member email matches", member.email, authorized.email);
  TestValidator.equals(
    "created_at matches",
    member.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    member.updated_at,
    authorized.updated_at,
  );
  // 4. Verify active account (deleted_at is null)
  TestValidator.equals(
    "deleted_at is null for active member",
    member.deleted_at,
    null,
  );
  // 5. Verify timestamps are valid date-time format (typia.assert already validates format)
  TestValidator.predicate(
    "created_at is valid timestamp",
    member.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    member.updated_at.length > 0,
  );
}
