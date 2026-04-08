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

export async function test_api_profile_display_name_minimum_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Update profile with minimum length display name (1 character)
  const singleCharName = RandomGenerator.alphabets(1);
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: singleCharName,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Validate the display name was updated to the single character
  TestValidator.equals(
    "display name updated to single character",
    updatedProfile.display_name,
    singleCharName,
  );
  // 4. Validate other profile fields are preserved
  TestValidator.equals("member id preserved", updatedProfile.id, joinResult.id);
  TestValidator.equals(
    "email preserved",
    updatedProfile.email,
    joinResult.email,
  );
  TestValidator.equals(
    "created_at is valid datetime",
    updatedProfile.created_at,
    joinResult.created_at,
  );
  TestValidator.predicate(
    "updated_at exists and is valid",
    updatedProfile.updated_at.length > 0,
  );
}
