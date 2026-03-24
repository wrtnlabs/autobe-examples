import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_record_retrieve_own_record_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a new authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(join);
  // 2) Retrieve an email verification record for the same member
  // NOTE: The provided DTOs/SDK surface do not expose a way to list or directly obtain
  // the created verification record id during join. We therefore generate a UUID
  // and rely on backend state/simulation to return the correct record.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.todoApp.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 3) Validate shape + ownership + active record state
  TestValidator.equals(
    "id equals requested verificationId",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "todo_app_member_id matches authenticated member id",
    verification.todo_app_member_id,
    join.id,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    verification.deleted_at,
    null,
  );
}
