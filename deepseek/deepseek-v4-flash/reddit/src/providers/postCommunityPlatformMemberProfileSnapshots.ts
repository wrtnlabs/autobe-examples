import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformProfileSnapshotCollector } from "../collectors/CommunityPlatformProfileSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileSnapshotTransformer } from "../transformers/CommunityPlatformProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberProfileSnapshots(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfileSnapshot.ICreate;
}): Promise<ICommunityPlatformProfileSnapshot> {
  // Look up the member's profile via member_id unique constraint
  const memberProfile =
    await MyGlobal.prisma.community_platform_profiles.findUniqueOrThrow({
      where: { member_id: props.member.id },
      select: { id: true },
    });
  const record =
    await MyGlobal.prisma.community_platform_profile_snapshots.create({
      data: await CommunityPlatformProfileSnapshotCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id } satisfies IEntity,
        communityPlatformProfiles: { id: memberProfile.id } satisfies IEntity,
      }),
      ...CommunityPlatformProfileSnapshotTransformer.select(),
    });
  return await CommunityPlatformProfileSnapshotTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityPlatformProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileSnapshot";
// import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberProfileSnapshots(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformProfileSnapshot.ICreate;
// }): Promise<ICommunityPlatformProfileSnapshot> {
//   const record = await MyGlobal.prisma.community_platform_profile_snapshots.create({
//     data: await CommunityPlatformProfileSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformProfileSnapshotTransformer.select(),
//   });
//   return await CommunityPlatformProfileSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------