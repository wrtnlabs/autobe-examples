import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_display_name_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member account (join) to obtain an authenticated session
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const password = "P@ssword-" + RandomGenerator.alphaNumeric(16);
  const memberEmail =
    `${RandomGenerator.alphaNumeric(10)}-${RandomGenerator.alphaNumeric(6)}@test.com` satisfies string &
      typia.tags.Format<"email">;
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberJoinConnection,
    {
      body: {
        email: memberEmail,
        password: password satisfies string & typia.tags.Format<"password">,
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}` satisfies string &
          typia.tags.Format<"uri">,
        referrer:
          `https://referrer.example.com/${RandomGenerator.alphaNumeric(8)}` satisfies string &
            typia.tags.Format<"uri">,
      },
    },
  );
  typia.assert(authorized);

  const profileWithId = typia.assert(
    authorized.profile as (ITodoAppUserProfile & {
      id: ITodoAppUserProfile["id"];
    }),
  );

  // Capture pre-update profile timestamps from the authorized payload
  const profileBefore: ITodoAppUserProfile = typia.assert({
    id: profileWithId.id,
    display_name: typia.assert(profileWithId.display_name ?? ""),
    created_at: typia.assert(
      profileWithId.created_at ?? new Date().toISOString(),
    ),
    updated_at: typia.assert(
      profileWithId.updated_at ?? new Date().toISOString(),
    ),
    deleted_at: (profileWithId.deleted_at ?? null) as any,
  } satisfies ITodoAppUserProfile);

  // 2) Update display_name
  const newDisplayName = RandomGenerator.name(3);
  const updated: ITodoAppUserProfile =
    await api.functional.todoApp.member.profile.update(memberJoinConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    });
  typia.assert(updated);

  // 3) Validate
  TestValidator.equals(
    "display_name matches updated value",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "updated_at is later than before",
    updated.updated_at > profileBefore.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    profileBefore.created_at,
  );
  // deleted_at should remain unchanged (if present)
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    profileBefore.deleted_at,
  );
}
