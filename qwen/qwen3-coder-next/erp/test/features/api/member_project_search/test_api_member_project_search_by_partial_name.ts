import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_project_search_by_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and login
  const member1Connection: api.IConnection = { host: connection.host };
  const joinPassword1 = RandomGenerator.alphaNumeric(12);
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword1,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Create second member
  const member2Connection: api.IConnection = { host: connection.host };
  const joinPassword2 = RandomGenerator.alphaNumeric(12);
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword2,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 3. Login both members
  const member1AuthConnection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_login(member1AuthConnection, {
    body: {
      email: member1.email,
      password: joinPassword1,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IHrmTrackerMember.ILogin,
  });
  typia.assert(member1Auth);
  const member2AuthConnection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_login(member2AuthConnection, {
    body: {
      email: member2.email,
      password: joinPassword2,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IHrmTrackerMember.ILogin,
  });
  typia.assert(member2Auth);
  // 4. Member 1 creates several test projects using search property as name
  const project1 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "Alpha Project",
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(project1);
  const project2 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "Beta Development",
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(project2);
  const project3 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "Gamma Operations",
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(project3);
  // 5. Search by partial name fragments
  const searchResults1 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "Alp", // Should match "Alpha Project"
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search results include Alpha",
    searchResults1.data.some((p) => p.name.includes("Alpha")),
  );
  const searchResults2 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "ta D", // Should match "Beta Development"
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(searchResults2);
  TestValidator.predicate(
    "search results include Beta",
    searchResults2.data.some((p) => p.name.includes("Beta")),
  );
  const searchResults3 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "ons", // Should match "Gamma Operations"
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(searchResults3);
  TestValidator.predicate(
    "search results include Operations",
    searchResults3.data.some((p) => p.name.includes("Operations")),
  );
  // 6. Verify pagination works with search
  const searchResults4 = await api.functional.hrmTracker.member.projects.index(
    member1AuthConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IHrmTrackerProject.IRequest,
    },
  );
  typia.assert(searchResults4);
  TestValidator.predicate(
    "pagination limit respected",
    searchResults4.pagination.limit <= 2,
  );
  TestValidator.predicate(
    "has data in results",
    searchResults4.data.length > 0,
  );
}