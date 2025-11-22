import { IPage } from "./IPage";
import { ITodoAppSystemMetadata } from "./ITodoAppSystemMetadata";

export namespace IPageITodoAppSystemMetadata {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppSystemMetadata.ISummary[];
  };
}
