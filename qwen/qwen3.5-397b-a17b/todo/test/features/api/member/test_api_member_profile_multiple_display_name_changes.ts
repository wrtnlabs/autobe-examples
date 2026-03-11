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

export async function test_api_member_profile_multiple_display_name_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // 3. First profile update with "First Name"
  const firstUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "First Name",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Verify first update response
  TestValidator.equals(
    "first display name",
    firstUpdate.display_name,
    "First Name",
  );
  const firstUpdatedAt = firstUpdate.updated_at;
  const memberId = firstUpdate.id;
  const memberEmail = firstUpdate.email;
  const memberCreatedAt = firstUpdate.created_at;
  // 5. Second profile update with "Second Name"
  const secondUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "Second Name",
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 6. Verify second update response
  TestValidator.equals(
    "second display name",
    secondUpdate.display_name,
    "Second Name",
  );
  TestValidator.equals("id remains constant", secondUpdate.id, memberId);
  TestValidator.equals(
    "email remains constant",
    secondUpdate.email,
    memberEmail,
  );
  TestValidator.equals(
    "created_at remains constant",
    secondUpdate.created_at,
    memberCreatedAt,
  );
  // 7. Verify updated_at is more recent
  TestValidator.predicate(
    "updated_at is more recent",
    new Date(secondUpdate.updated_at).getTime() >
      new Date(firstUpdatedAt).getTime(),
  );
}
