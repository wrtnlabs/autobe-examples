import { tags } from "typia";

import { IRedditCloneCommunity } from "./IRedditCloneCommunity";
import { IRedditCloneFile } from "./IRedditCloneFile";

export namespace IRedditCloneCommunityIcon {
  /**
   * Request body for updating a community's icon image with a new uploaded file. The authenticated member must be the community owner or a moderator. The file must be previously uploaded and processed (status = 'processed').
   */
  export type IUpdate = {
    /**
     * The unique identifier of the uploaded file to use as the community icon. The file must have status 'processed' and be associated with the community.
     *
         * @x-autobe-database-schema-property reddit_clone_file_id
         * @x-autobe-specification Direct mapping to
         *   reddit_clone_community_icons.reddit_clone_file_id. The value is a
         *   UUID referencing an existing processed file in reddit_clone_files.
         *   File must have status='processed' and be associated with the
         *   community via reddit_clone_file_associations.
     */
    fileId: string & tags.Format<"uuid">;
  };

  /**
   * Community icon with parent community context. Returns the icon record including file metadata and the parent community summary for context.
   */
  export type IInvert = {
    /**
     * Unique identifier for this community icon record.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_clone_community_icons.id (UUID).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this icon was uploaded or assigned to the community.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_clone_community_icons.created_at.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * The parent community that owns this icon.
     *
         * @x-autobe-database-schema-property community
         * @x-autobe-specification Join via reddit_clone_community_id FK to
         *   reddit_clone_communities.id. Returns IRedditCloneCommunity.ISummary
         *   for parent community context.
     */
    community: IRedditCloneCommunity.ISummary;

    /**
     * The uploaded file serving as the community icon.
     *
         * @x-autobe-database-schema-property file
         * @x-autobe-specification Join via reddit_clone_file_id FK to
         *   reddit_clone_files.id. Returns IRedditCloneFile.ISummary with file
         *   metadata (original_filename, mime_type, file_size, status).
     */
    file: IRedditCloneFile.ISummary;
  };
}
