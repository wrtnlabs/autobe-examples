import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardProfile";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_update(connection: api.IConnection): Promise<void> {
    // Create new member connection and join
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEconPoliticBoardMember.IJoin
    });

    // Generate realistic display name with max 30 characters
    const newDisplayName = typia.random<string & tags.MaxLength<30>>();
    
    // Generate realistic bio with max 500 characters
    const newBio = typia.random<string & tags.MaxLength<500>>();
    
    // Update profile with realistic data
    const updatedProfile = await api.functional.econPoliticBoard.member.profile.update(memberConnection, {
        body: {
            display_name: newDisplayName,
            bio: newBio,
        } satisfies IEconPoliticBoardProfile.IUpdate
    });

    // Verify the update with correct parameter order
    TestValidator.equals("display name verification", newDisplayName, updatedProfile.display_name);
    TestValidator.equals("bio verification", newBio, updatedProfile.bio);
}