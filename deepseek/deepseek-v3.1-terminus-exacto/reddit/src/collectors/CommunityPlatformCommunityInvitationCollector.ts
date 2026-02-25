import { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityInvitationCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityInvitation.ICreate;
    communityPlatformCommunities: IEntity; // from path parameter communityId
    communityPlatformUsers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      status: "pending",
      message: props.body.message ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      accepted_at: null,
      rejected_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      community: { connect: { id: props.communityPlatformCommunities.id } },
      inviter: { connect: { id: props.communityPlatformUsers.id } },
      invitee: { connect: { id: props.body.invitee_id } },
    } satisfies Prisma.community_platform_community_invitationsCreateInput;
  }
}
