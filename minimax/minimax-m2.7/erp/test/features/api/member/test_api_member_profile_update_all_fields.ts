import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_update_all_fields(connection: api.IConnection): Promise<void> {
    // 1. Register a new member account to obtain valid authentication
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            displayName: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(authorized);
    // 2. Prepare update data with all fields
    const newDisplayName = RandomGenerator.name();
    const newAvatarUri = `https://example.com/avatars/${RandomGenerator.alphaNumeric(12)}.png`;
    const newPhone = RandomGenerator.mobile();
    const updateBody = {
        display_name: newDisplayName satisfies string & tags.MinLength<1> & tags.MaxLength<255>,
        avatar_uri: newAvatarUri satisfies string & tags.MaxLength<80000> & tags.Format<"uri">,
        phone: newPhone,
    } satisfies IErpHrmMember.IUpdate;
    // 3. Call PUT /erpHrm/member/profile to update profile
    const updated = await api.functional.erpHrm.member.profile.updateProfile(memberConnection, {
        body: updateBody,
    });
    const safeUpdated = typia.assert<IErpHrmMember>(updated);
    // 4. Validate response returns complete IErpHrmMember object
    TestValidator.equals("response has activeTimers", Array.isArray(safeUpdated.activeTimers), true);
    TestValidator.equals("response has projectSummary", typeof safeUpdated.projectSummary, "object");
    TestValidator.equals("response has taskOverview", typeof safeUpdated.taskOverview, "object");
    TestValidator.equals("response has recentActivity", typeof safeUpdated.recentActivity, "object");
    // 5. Validate display_name is correctly updated
    TestValidator.equals("display_name matches new value", (safeUpdated as any).display_name, newDisplayName);
    // 6. Validate avatar_uri matches the new URI
    TestValidator.equals("avatar_uri matches new value", (safeUpdated as any).avatar_uri, newAvatarUri);
    // 7. Validate phone number is correctly set
    TestValidator.equals("phone matches new value", (safeUpdated as any).phone, newPhone);
    // 8. Validate that updated_at timestamp reflects the change (should be recent)
    const updatedAt = (safeUpdated as any).updated_at;
    if (updatedAt) {
        const updatedAtDate = new Date(updatedAt);
        const now = new Date();
        const timeDiff = now.getTime() - updatedAtDate.getTime();
        TestValidator.predicate("updated_at is recent (within 1 minute)", timeDiff < 60000);
    }
    // 9. Validate id and email remain unchanged
    TestValidator.equals("id is preserved", (safeUpdated as any).id, authorized.id);
    TestValidator.equals("email is preserved", (safeUpdated as any).email, authorized.email);
}