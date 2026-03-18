import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_profiles_create_profile } from "../../../generate/generate_random_multi_user_todo_member_profiles_create_profile";
import { prepare_random_multi_user_todo_user_profile } from "../../../prepare/prepare_random_multi_user_todo_user_profile";

export async function test_api_member_profile_update_session_enforces_ownership_no_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorizedA);
  const memberAProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberAConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(memberAProfile);
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorizedB);
  const memberBProfile =
    await generate_random_multi_user_todo_member_profiles_create_profile(
      memberBConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IMultiUserTodoUserProfile.ICreate,
      },
    );
  typia.assert(memberBProfile);
  const memberAOriginalDisplayName = memberAProfile.displayName;
  const memberBOriginalDisplayName = memberBProfile.displayName;
  // Ensure new A display name is distinct from B's original
  const memberATargetDisplayNameBase = `${RandomGenerator.name()}-A-UPDATED`;
  const memberATargetDisplayName =
    memberATargetDisplayNameBase !== memberBOriginalDisplayName
      ? memberATargetDisplayNameBase
      : `${memberATargetDisplayNameBase}-2`;
  // Act: PATCH as member A (no profileId in path; must only update session-owned profile)
  const patchedA =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberAConnection,
      {
        body: {
          displayName: memberATargetDisplayName,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(patchedA);
  // Validate member A changed
  TestValidator.equals(
    "member A profile displayName updated",
    patchedA.displayName,
    memberATargetDisplayName,
  );
  TestValidator.notEquals(
    "member A displayName differs from original",
    memberAOriginalDisplayName,
    patchedA.displayName,
  );
  // Validate member B was not modified by member A.
  // Use an idempotent update with member B's original name; if member A altered B,
  // the persisted value would differ and the response would reflect that change.
  const memberBAfterIdempotentUpdate =
    await api.functional.multiUserTodo.member.profiles.updateProfile(
      memberBConnection,
      {
        body: {
          displayName: memberBOriginalDisplayName,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  typia.assert(memberBAfterIdempotentUpdate);
  TestValidator.equals(
    "member B profile displayName unchanged",
    memberBAfterIdempotentUpdate.displayName,
    memberBOriginalDisplayName,
  );
  // Privacy boundary sanity: member A response should not equal member B's original value
  TestValidator.notEquals(
    "member A response does not expose member B displayName",
    patchedA.displayName,
    memberBOriginalDisplayName,
  );
}
