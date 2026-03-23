import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
    phone: null,
  } satisfies IHrmTrackerMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorizedMember);
  // Step 2: Login to establish session
  const loginBody: IHrmTrackerMember.ILogin = {
    email: joinBody.email,
    password: joinBody.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  };
  const sessionMember = await authorize_member_login(memberConnection, {
    body: loginBody,
  });
  typia.assert(sessionMember);
  // Step 3: Retrieve profile with authenticated session
  const profile =
    await api.functional.hrmTracker.member.profile.at(memberConnection);
  typia.assert(profile);
  // Step 4: Validate profile contains expected global profile fields
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    joinBody.display_name,
  );
  TestValidator.equals("email matches", profile.email, joinBody.email);
  TestValidator.equals("phone is null as set", profile.phone, null);
  TestValidator.equals(
    "email_verified is false initially",
    profile.email_verified,
    false,
  );
  TestValidator.predicate(
    "has valid created_at",
    new Date(profile.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "has valid updated_at",
    new Date(profile.updated_at) instanceof Date,
  );
  TestValidator.equals("status is active", profile.status, "active");
  TestValidator.equals(
    "id matches authorized member",
    profile.id,
    sessionMember.id,
  );
}
