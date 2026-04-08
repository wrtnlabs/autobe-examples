import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community(
  input?: DeepPartial<IRedditCloneCommunity.ICreate>,
): IRedditCloneCommunity.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<21> &
          tags.Pattern<"^[a-z0-9_]+$">
      >(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    ...(input?.icon !== undefined && {
      icon: (() => {
        const iconInput = input.icon!;
        return {
          createdAt:
            iconInput.createdAt ??
            typia.random<string & tags.Format<"date-time">>(),
          fileSize:
            iconInput.fileSize ?? typia.random<number & tags.Type<"int32">>(),
          id: iconInput.id ?? typia.random<string & tags.Format<"uuid">>(),
          mimeType: iconInput.mimeType ?? "image/png",
          originalFilename:
            iconInput.originalFilename ?? RandomGenerator.alphabets(10),
          status: iconInput.status ?? "processed",
          storedFilename:
            iconInput.storedFilename ??
            typia.random<string & tags.Format<"uuid">>() + ".png",
          storagePath:
            iconInput.storagePath ??
            "/storage/files/" + RandomGenerator.alphabets(10),
          updatedAt:
            iconInput.updatedAt ??
            typia.random<string & tags.Format<"date-time">>(),
          deletedAt: iconInput.deletedAt ?? null,
          thumbnails:
            iconInput.thumbnails != null
              ? iconInput.thumbnails.map((thumb) => ({
                  items: {
                    id:
                      thumb.items?.id ??
                      typia.random<string & tags.Format<"uuid">>(),
                    width:
                      thumb.items?.width ??
                      typia.random<
                        number &
                          tags.Type<"int32"> &
                          tags.Minimum<50> &
                          tags.Maximum<500>
                      >(),
                    height:
                      thumb.items?.height ??
                      typia.random<
                        number &
                          tags.Type<"int32"> &
                          tags.Minimum<50> &
                          tags.Maximum<500>
                      >(),
                    variant: thumb.items?.variant ?? "small",
                    thumbnailPath:
                      thumb.items?.thumbnailPath ?? "/thumbnails/small.png",
                    createdAt:
                      thumb.items?.createdAt ??
                      typia.random<string & tags.Format<"date-time">>(),
                  },
                }))
              : ArrayUtil.repeat(
                  typia.random<
                    number &
                      tags.Type<"uint32"> &
                      tags.Minimum<1> &
                      tags.Maximum<3>
                  >(),
                  () => ({
                    items: {
                      id: typia.random<string & tags.Format<"uuid">>(),
                      width: typia.random<
                        number &
                          tags.Type<"int32"> &
                          tags.Minimum<50> &
                          tags.Maximum<500>
                      >(),
                      height: typia.random<
                        number &
                          tags.Type<"int32"> &
                          tags.Minimum<50> &
                          tags.Maximum<500>
                      >(),
                      variant: "small",
                      thumbnailPath: "/thumbnails/small.png",
                      createdAt: typia.random<
                        string & tags.Format<"date-time">
                      >(),
                    },
                  }),
                ),
          uploader: {
            id:
              iconInput.uploader?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            username: iconInput.uploader?.username ?? RandomGenerator.name(1),
          },
          scans:
            iconInput.scans != null
              ? iconInput.scans.map((scan) => ({
                  id: scan.id ?? typia.random<string & tags.Format<"uuid">>(),
                  scannedAt:
                    scan.scannedAt ??
                    typia.random<string & tags.Format<"date-time">>(),
                  scanner: scan.scanner ?? "ClamAV 1.0.0",
                  status: scan.status ?? "clean",
                  threatName: scan.threatName,
                  details: scan.details,
                  createdAt:
                    scan.createdAt ??
                    typia.random<string & tags.Format<"date-time">>(),
                  updatedAt:
                    scan.updatedAt ??
                    typia.random<string & tags.Format<"date-time">>(),
                  file: {
                    createdAt:
                      scan.file?.createdAt ??
                      typia.random<string & tags.Format<"date-time">>(),
                    fileSize:
                      scan.file?.fileSize ??
                      typia.random<number & tags.Type<"int32">>(),
                    id:
                      scan.file?.id ??
                      typia.random<string & tags.Format<"uuid">>(),
                    mimeType: scan.file?.mimeType ?? "image/png",
                    originalFilename:
                      scan.file?.originalFilename ??
                      RandomGenerator.alphabets(10),
                    status: scan.file?.status ?? "processed",
                    uploader: {
                      id:
                        scan.file?.uploader?.id ??
                        typia.random<string & tags.Format<"uuid">>(),
                      username:
                        scan.file?.uploader?.username ??
                        RandomGenerator.name(1),
                    },
                  },
                }))
              : [],
          associations:
            iconInput.associations != null
              ? iconInput.associations.map((assoc) => ({
                  id: assoc.id ?? typia.random<string & tags.Format<"uuid">>(),
                  userId:
                    assoc.userId ??
                    typia.random<string & tags.Format<"uuid">>(),
                  file: {
                    createdAt:
                      assoc.file?.createdAt ??
                      typia.random<string & tags.Format<"date-time">>(),
                    fileSize:
                      assoc.file?.fileSize ??
                      typia.random<number & tags.Type<"int32">>(),
                    id:
                      assoc.file?.id ??
                      typia.random<string & tags.Format<"uuid">>(),
                    mimeType: assoc.file?.mimeType ?? "image/png",
                    originalFilename:
                      assoc.file?.originalFilename ??
                      RandomGenerator.alphabets(10),
                    status: assoc.file?.status ?? "processed",
                    uploader: {
                      id:
                        assoc.file?.uploader?.id ??
                        typia.random<string & tags.Format<"uuid">>(),
                      username:
                        assoc.file?.uploader?.username ??
                        RandomGenerator.name(1),
                    },
                  },
                  createdAt:
                    assoc.createdAt ??
                    typia.random<string & tags.Format<"date-time">>(),
                }))
              : [],
        };
      })(),
    }),
  };
}
