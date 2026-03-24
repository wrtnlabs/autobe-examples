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

export async function test_api_member_context_retrieval_with_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInputEmail = typia.random<string & tags.Format<"email">>();
  const joinInputPassword = typia.random<string & tags.Format<"password">>();
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: joinInputEmail,
      password: joinInputPassword,
      href: joinHref,
      referrer: joinReferrer,
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Retrieve member context (scoped to the authenticated member)
  const response =
    await api.functional.todoApp.member.members.at(memberConnection);
  typia.assert(response);
  // 3) Validate scoping (id/email)
  TestValidator.equals("member id matches session", response.id, authorized.id);
  TestValidator.equals(
    "member email matches session",
    response.email,
    authorized.email,
  );
  // 4) Validate profile personalization handling
  const profile = response.profile;
  const joinedProfile = authorized.profile;
  if (
    joinedProfile.display_name !== null &&
    joinedProfile.display_name !== undefined
  ) {
    TestValidator.equals(
      "profile.display_name matches joined authorization",
      profile.display_name,
      joinedProfile.display_name,
    );
  }
  if (
    joinedProfile.created_at !== null &&
    joinedProfile.created_at !== undefined
  ) {
    TestValidator.equals(
      "profile.created_at matches joined authorization",
      profile.created_at,
      joinedProfile.created_at,
    );
  }
  if (
    joinedProfile.updated_at !== null &&
    joinedProfile.updated_at !== undefined
  ) {
    TestValidator.equals(
      "profile.updated_at matches joined authorization",
      profile.updated_at,
      joinedProfile.updated_at,
    );
  }
  // 5) Privacy: response must not expose credential material
  TestValidator.predicate("no password hash in response", () => {
    const record = response as unknown as Record<string, unknown>;
    return record.password_hash === undefined;
  });
  TestValidator.predicate("no password in response", () => {
    const record = response as unknown as Record<string, unknown>;
    return record.password === undefined;
  });
  TestValidator.predicate("no credential token in response", () => {
    const record = response as unknown as Record<string, unknown>;
    return record.token === undefined;
  });
}
