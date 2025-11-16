import { IPage } from "./IPage";
import { IRedditCommunityKnowledgeBase } from "./IRedditCommunityKnowledgeBase";

export namespace IPageIRedditCommunityKnowledgeBase {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityKnowledgeBase.ISummary[];
  };
}
