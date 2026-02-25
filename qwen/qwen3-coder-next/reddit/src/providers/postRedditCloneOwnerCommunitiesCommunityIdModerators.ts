import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneModeratorAssignmentTransformer } from "../transformers/RedditCloneModeratorAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneOwnerCommunitiesCommunityIdModerators(props: {
  owner: OwnerPayload;
  communityId: string;
  body: IRedditCloneModeratorAssignment.ICreate;
}): Promise<IRedditCloneModeratorAssignment> {
  // Verify the community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Verify the appointing actor is the owner of this community
  const ownerAssignment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirstOrThrow({
      where: {
        community_id: props.communityId,
        appointing_actor_id: props.owner.id,
        role: "owner",
        status: "active",
      },
    });
  // Verify the target user exists
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.body.appointedActorId },
  });
  // Check for existing appointment to prevent duplicates
  const existingAppointment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        appointed_actor_id: props.body.appointedActorId,
        status: "active",
      },
    });
  if (existingAppointment) {
    throw new HttpException("Conflict", 409);
  }
  // Create the moderator assignment record
  const created =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: props.communityId,
        appointed_actor_id: props.body.appointedActorId,
        appointing_actor_id: props.owner.id,
        role: props.body.role,
        assigned_at: new Date(),
        status: "active",
        revoked_at: null,
        revoked_by_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...RedditCloneModeratorAssignmentTransformer.select(),
    });
  // Return the transformed result
  return await RedditCloneModeratorAssignmentTransformer.transform(created);
}
