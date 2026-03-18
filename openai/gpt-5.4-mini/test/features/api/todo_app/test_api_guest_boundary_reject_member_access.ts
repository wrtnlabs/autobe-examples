import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_boundary_reject_member_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberAuthorized);
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {} satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuthorized);
  const guestContext =
    await api.functional.todoApp.guest.guests.at(guestConnection);
  typia.assert(guestContext);
  TestValidator.equals(
    "guest id should match the authorized guest",
    guestContext.id,
    guestAuthorized.id,
  );
  TestValidator.equals(
    "guest created_at should match the authorized guest",
    guestContext.created_at,
    guestAuthorized.created_at,
  );
  TestValidator.equals(
    "guest updated_at should match the authorized guest",
    guestContext.updated_at,
    guestAuthorized.updated_at,
  );
  TestValidator.equals(
    "guest deleted_at should match the authorized guest",
    guestContext.deleted_at,
    guestAuthorized.deleted_at,
  );
}
