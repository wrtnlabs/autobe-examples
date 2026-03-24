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

export async function test_api_member_context_retrieval_without_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<string & tags.Format<"password">>();
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers = {};
  authedConnection.headers.Authorization = authorized.token.access;
  const output =
    await api.functional.todoApp.member.members.at(authedConnection);
  typia.assert(output);
  TestValidator.equals("member id matches", output.id, authorized.id);
  TestValidator.equals("member email matches", output.email, authorized.email);
  TestValidator.equals(
    "deleted_at should be null for active member",
    output.deleted_at,
    null,
  );
  TestValidator.equals(
    "profile.display_name should be null when profile missing",
    output.profile.display_name ?? null,
    null,
  );
  TestValidator.equals(
    "profile.created_at should be null when profile missing",
    output.profile.created_at ?? null,
    null,
  );
  TestValidator.equals(
    "profile.updated_at should be null when profile missing",
    output.profile.updated_at ?? null,
    null,
  );
  TestValidator.equals(
    "profile.deleted_at should be null when profile missing",
    output.profile.deleted_at ?? null,
    null,
  );
}
