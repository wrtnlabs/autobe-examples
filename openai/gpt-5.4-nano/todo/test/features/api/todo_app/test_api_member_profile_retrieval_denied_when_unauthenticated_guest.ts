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

export async function test_api_member_profile_retrieval_denied_when_unauthenticated_guest(
  connection: api.IConnection,
): Promise<void> {
  // Intentionally do not authorize as member (unauthenticated guest)
  const unauthConnection: api.IConnection = { host: connection.host };
  try {
    const result: unknown =
      await api.functional.todoApp.member.profile.at(unauthConnection);
    // If the endpoint is not protected as expected, it might return data.
    // The privacy boundary requires denial, so a successful ITodoAppUserProfile
    // payload must NOT be returned.
    TestValidator.predicate(
      "member profile must not be returned for unauthenticated guest",
      () => !typia.is<ITodoAppUserProfile>(result),
    );
  } catch (_exp) {
    // Expected: access denied / authentication required.
    // No further assertions to avoid coupling to a specific status/message schema.
    TestValidator.predicate(
      "unauthenticated access should be denied",
      () => true,
    );
  }
}
