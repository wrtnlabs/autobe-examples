import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_display_name_update_concurrent_consistency(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test concurrent display name updates for a member profile.
   *
   * Validates that:
   * 1. Two concurrent PUT /member/profile requests for the same authenticated member each return the display_name submitted by that request.
   * 2. The profile record does not end up in a partially updated/inconsistent display_name state.
   * 3. After both concurrent updates complete, a final sequential PUT update with a new display_name overwrites the profile and becomes the latest visible write.
   *
   * Updates are validated via server-returned display_name and updated_at timestamps.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const update1: api.IConnection = {
    host: connection.host,
    headers: { ...memberConnection.headers },
  };
  const update2: api.IConnection = {
    host: connection.host,
    headers: { ...memberConnection.headers },
  };
  const concurrentName1 = "Concurrent Name 1";
  const concurrentName2 = "Concurrent Name 2";
  const req1Body = {
    display_name: concurrentName1,
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const req2Body = {
    display_name: concurrentName2,
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const [r1, r2] = await Promise.all([
    api.functional.multiUserTodo.member.profile.put(update1, {
      body: req1Body,
    }),
    api.functional.multiUserTodo.member.profile.put(update2, {
      body: req2Body,
    }),
  ]);
  typia.assert(r1);
  typia.assert(r2);
  TestValidator.equals(
    "concurrent response 1 display_name matches submitted value",
    r1.display_name,
    concurrentName1,
  );
  TestValidator.equals(
    "concurrent response 2 display_name matches submitted value",
    r2.display_name,
    concurrentName2,
  );
  const finalName = "Final Name";
  const finalBody = {
    display_name: finalName,
  } satisfies IMultiUserTodoUserProfile.IUpdate;
  const final = await api.functional.multiUserTodo.member.profile.put(update1, {
    body: finalBody,
  });
  typia.assert(final);
  TestValidator.equals(
    "final response display_name equals final name",
    final.display_name,
    finalName,
  );
  const r1UpdatedAt = new Date(r1.updated_at).getTime();
  const r2UpdatedAt = new Date(r2.updated_at).getTime();
  const finalUpdatedAt = new Date(final.updated_at).getTime();
  TestValidator.predicate(
    "final updated_at is not earlier than either concurrent updated_at",
    finalUpdatedAt >= Math.max(r1UpdatedAt, r2UpdatedAt),
  );
}
