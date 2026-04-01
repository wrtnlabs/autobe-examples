import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_settings_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const ownerName = RandomGenerator.name();
  const ownerPassword = "P@ssw0rd1234!";
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      name: ownerName,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const ownerOrgConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuthorized.token.access,
    },
  };
  const firstName = `${RandomGenerator.name()} org`;
  const firstDescription = RandomGenerator.paragraph({ sentences: 2 });
  const firstLogoImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`;
  const firstUpdated =
    await api.functional.erpHrmTime.member.organizations.patch(
      ownerOrgConnection,
      {
        body: {
          name: firstName,
          description: firstDescription,
          logoImageUrl: firstLogoImageUrl,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(firstUpdated);
  TestValidator.equals(
    "organization name updated",
    firstUpdated.name,
    firstName,
  );
  TestValidator.equals(
    "organization description updated",
    firstUpdated.description,
    firstDescription,
  );
  TestValidator.equals(
    "organization logo updated",
    firstUpdated.logoImageUrl,
    firstLogoImageUrl,
  );
  const secondDescription = RandomGenerator.paragraph({ sentences: 3 });
  const secondUpdated =
    await api.functional.erpHrmTime.member.organizations.patch(
      ownerOrgConnection,
      {
        body: {
          description: secondDescription,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(secondUpdated);
  TestValidator.equals(
    "organization name preserved",
    secondUpdated.name,
    firstUpdated.name,
  );
  TestValidator.equals(
    "organization description changed",
    secondUpdated.description,
    secondDescription,
  );
  TestValidator.equals(
    "organization logo preserved",
    secondUpdated.logoImageUrl,
    firstUpdated.logoImageUrl,
  );
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuthorized = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: ownerPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(nonOwnerAuthorized);
  const nonOwnerOrgConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: nonOwnerAuthorized.token.access,
    },
  };
  await TestValidator.error(
    "non-owner cannot update organization settings",
    async () => {
      await api.functional.erpHrmTime.member.organizations.patch(
        nonOwnerOrgConnection,
        {
          body: {
            name: `${firstName} forbidden`,
          } satisfies IErpHrmTimeOrganization.IUpdate,
        },
      );
    },
  );
  const afterForbiddenAttempt =
    await api.functional.erpHrmTime.member.organizations.patch(
      ownerOrgConnection,
      {
        body: {
          name: firstUpdated.name,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(afterForbiddenAttempt);
  TestValidator.equals(
    "organization settings unchanged after forbidden attempt",
    afterForbiddenAttempt.name,
    firstUpdated.name,
  );
  TestValidator.equals(
    "organization description unchanged after forbidden attempt",
    afterForbiddenAttempt.description,
    secondUpdated.description,
  );
  TestValidator.equals(
    "organization logo unchanged after forbidden attempt",
    afterForbiddenAttempt.logoImageUrl,
    secondUpdated.logoImageUrl,
  );
}
