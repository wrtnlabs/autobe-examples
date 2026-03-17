import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the successful update of a member's display name.
 * This scenario validates the primary success path where an authenticated
 * member updates their profile display name with a valid new value.
 */
export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate complete join data using typia.random to ensure all fields are present
  const joinData = typia.random<ITodoAppMember.IJoin>();
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: joinData,
  });
  typia.assert(authorizedMember);
  // Store initial data for comparison
  const originalEmail = authorizedMember.email;
  const originalDisplayName = authorizedMember.display_name;
  const originalCreatedAt = authorizedMember.created_at;
  // 2. Update display name with a new valid value
  // Generate update data with typia.random and modify display_name
  const updateData = typia.random<ITodoAppMember.IUpdate>();
  const newDisplayName = RandomGenerator.name();
  updateData.display_name = newDisplayName;
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: updateData satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Validate all fields are present and correct
  TestValidator.equals(
    "id should match",
    updatedProfile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    originalEmail,
  );
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name should be different from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    () => {
      const createdDate = new Date(updatedProfile.created_at);
      const updatedDate = new Date(updatedProfile.updated_at);
      return updatedDate > createdDate;
    },
  );
  TestValidator.equals(
    "deleted_at should be null for active account",
    updatedProfile.deleted_at,
    null,
  );
}
