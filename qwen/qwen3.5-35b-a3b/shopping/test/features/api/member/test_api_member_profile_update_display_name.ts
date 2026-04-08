import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with initial display name and phone number
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      display_name: "John Doe",
      phone_number: "+821012345678",
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResponse);
  const initialDisplayName = joinResponse.display_name;
  const initialPhoneNumber = joinResponse.phone_number;
  const initialCreatedAt = joinResponse.created_at;
  TestValidator.equals("initial display name", initialDisplayName, "John Doe");
  TestValidator.equals(
    "initial phone number",
    initialPhoneNumber,
    "+821012345678",
  );
  // 2. Create a new authorized connection with the member's token for profile updates
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Submit profile update request with new display name
  const updateBody = {
    display_name: "Jonathan Smith",
  } satisfies IEcommerceMallMember.IUpdate;
  const updateResponse =
    await api.functional.ecommerceMall.member.profile.update(memberConnection, {
      body: updateBody,
    });
  typia.assert(updateResponse);
  // 4. Verify the response contains the updated customer record
  TestValidator.equals(
    "updated display name",
    updateResponse.display_name,
    "Jonathan Smith",
  );
  // 5. Verify the phone_number remains unchanged
  TestValidator.equals(
    "phone number unchanged",
    updateResponse.phone_number,
    "+821012345678",
  );
  // 6. Verify the updated_at timestamp reflects the current time (after created_at)
  const updatedAt = new Date(updateResponse.updated_at).getTime();
  const createdAt = new Date(updateResponse.created_at).getTime();
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt > createdAt,
  );
  // 7. Verify that the member account ID remains the same (account wasn't recreated)
  TestValidator.equals(
    "member ID preserved",
    updateResponse.id,
    joinResponse.id,
  );
  // Note: Snapshot verification would require database-level access or a snapshot API endpoint
  // This test validates the profile update operation and its immediate response
  // Snapshot immutability and audit trail preservation are verified through database queries
  // in a separate snapshot-focused test
}
