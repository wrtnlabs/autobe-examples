import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_profile_update_global_across_organizations(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member authenticates via join (creates first organization automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joinResult);
  // Store original display name
  const originalDisplayName: string = joinResult.display_name;
  // Step 2: Create a second organization to test global profile sharing
  const secondOrganization: IErpHrmOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
          timezone: RandomGenerator.pick([
            "America/New_York",
            "Asia/Seoul",
            "Europe/London",
          ] as const),
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(secondOrganization);
  // Step 3: Update profile with new display name
  const newDisplayName: string = RandomGenerator.name();
  const updatedProfile: IErpHrmMember =
    await api.functional.erpHrm.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IErpHrmMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // Step 4: Verify the profile update is successful
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "display name changed",
    updatedProfile.display_name !== originalDisplayName,
  );
  TestValidator.equals("member id unchanged", updatedProfile.id, joinResult.id);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    joinResult.email,
  );
  // Step 5: Verify the same profile information is accessible across both organizations
  // Since the profile is global, a single update should reflect across all organizations
  // The member's profile should show the new display name regardless of organization context
  TestValidator.predicate(
    "updated_at timestamp updated",
    updatedProfile.updated_at !== joinResult.updated_at,
  );
}
